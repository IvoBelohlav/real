# app/utils/context.py
from typing import Dict, List, Optional, Set, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime
import re
import json
from collections import defaultdict
from app.utils.logging_config import get_module_logger

logger = get_module_logger(__name__)

class EnhancedConversationContext(BaseModel):
    """
    Highly dynamic conversation context tracker that adapts to any product category
    and collects constraints without predefined schema limitations.
    """
    
    # Basic conversation tracking
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None
    session_start: datetime = Field(default_factory=datetime.now)
    last_updated: datetime = Field(default_factory=datetime.now)
    
    # Dynamic attributes storage
    attributes: Dict[str, Any] = Field(default_factory=dict)
    
    # Common attributes with direct access for convenience
    category: Optional[str] = None
    subcategory: Optional[str] = None
    budget_range: Dict[str, float] = Field(default_factory=dict)
    required_features: List[str] = Field(default_factory=list)
    
    # Conversation memory
    previous_queries: List[str] = Field(default_factory=list)
    previous_intents: List[str] = Field(default_factory=list)
    entity_history: List[Dict[str, Any]] = Field(default_factory=list)
    confidence_levels: Dict[str, float] = Field(default_factory=dict)
    
    # Customized handling for different product domains
    domain_specific_handlers: Dict[str, str] = Field(default_factory=dict)
    
    def model_dump(self) -> Dict[str, Any]:
        """
        Returns a serializable dictionary representation of the context
        with proper datetime handling
        """
        data = super().model_dump()
        
        # Convert datetime objects to ISO strings
        if "session_start" in data and isinstance(data["session_start"], datetime):
            data["session_start"] = data["session_start"].isoformat()
        
        if "last_updated" in data and isinstance(data["last_updated"], datetime):
            data["last_updated"] = data["last_updated"].isoformat()
        
        # Check for datetime objects in attributes
        if "attributes" in data and isinstance(data["attributes"], dict):
            for key, value in data["attributes"].items():
                if isinstance(value, datetime):
                    data["attributes"][key] = value.isoformat()
        
        # Check for datetime objects in entity_history
        if "entity_history" in data and isinstance(data["entity_history"], list):
            for entry in data["entity_history"]:
                if isinstance(entry, dict) and "timestamp" in entry and isinstance(entry["timestamp"], datetime):
                    entry["timestamp"] = entry["timestamp"].isoformat()
        
        return data
    
    async def update_context(self, query: str, intent: Optional[str] = None, 
                           entities: Optional[Dict[str, Any]] = None) -> None:
        """
        Dynamically updates context based on the latest query and extracted entities.
        Adapts to the product domain and query type automatically.
        """
        # Update timestamps and history
        self.last_updated = datetime.now()
        self.previous_queries.append(query)
        
        if intent:
            self.previous_intents.append(intent)
            # Store confidence level if available
            if entities and "confidence" in entities:
                self.confidence_levels[intent] = entities["confidence"]
        
        # Skip processing if no entities were extracted
        if not entities:
            logger.warning("No entities extracted from query")
            return
            
        # Store entity history for long-term learning
        self.entity_history.append({
            "timestamp": datetime.now().isoformat(),
            "query": query,
            "intent": intent,
            "entities": entities
        })
        
        # Process extracted entities
        for key, value in entities.items():
            # Handle standard common attributes for direct access
            if key == "category" and value:
                self.category = value
                self.attributes["category"] = value
                
            elif key == "subcategory" and value:
                self.subcategory = value
                self.attributes["subcategory"] = value
                
            elif key == "price_range" and value:
                # Merge with existing price range rather than replace
                if isinstance(value, dict):
                    for k, v in value.items():
                        self.budget_range[k] = v
                        
                # Also store in attributes for consistency
                self.attributes["price_range"] = self.budget_range
                
            elif key == "features" and value:
                if isinstance(value, list):
                    for feature in value:
                        if feature not in self.required_features:
                            self.required_features.append(feature)
                elif isinstance(value, str) and value not in self.required_features:
                    self.required_features.append(value)
                    
                # Also store in attributes
                self.attributes["required_features"] = self.required_features
                
            # Store all entity values in the attributes dictionary
            # This ensures we capture everything, even custom attributes
            else:
                self.attributes[key] = value
                
        # Determine product domain and apply domain-specific processing
        self._apply_domain_specific_processing(query, entities)
        
        # Process complex relationships between attributes
        self._resolve_attribute_conflicts()
        
        # Update attribute dependencies
        self._update_attribute_dependencies()
        
        logger.info(f"Updated context: {self.get_readable_summary()}")

    def _apply_domain_specific_processing(self, query: str, entities: Dict[str, Any]) -> None:
        """
        Applies domain-specific processing based on detected category
        """
        category = self.category or self._detect_category_from_query(query)
        
        if not category:
            logger.debug("No category detected for domain-specific processing")
            return
            
        # Store current domain for future reference
        self.attributes["current_domain"] = category
        
        # Apply category-specific attribute processing
        domain_handlers = {
            "kolo": self._process_bike_domain,
            "televize": self._process_tv_domain,
            "notebook": self._process_laptop_domain,
            "smartphone": self._process_smartphone_domain,
            "pračka": self._process_washer_domain,
            # Add handlers for other domains as needed
        }
        
        # Get the appropriate handler or use generic
        handler = domain_handlers.get(category, self._process_generic_domain)
        
        # Call the domain-specific handler
        handler(query, entities)
        
    def _detect_category_from_query(self, query: str) -> Optional[str]:
        """
        Detects product category from query if not already present in context
        """
        query_lower = query.lower()
        
        # Map of category keywords - extensible for any new domain
        category_keywords = {
            "kolo": ["kolo", "kola", "jízdní", "bicykl", "bike"],
            "televize": ["televize", "tv", "televizor", "televizní"],
            "notebook": ["notebook", "laptop", "notebooky", "počítač"],
            "smartphone": ["smartphone", "telefon", "mobil", "iphone", "android"],
            "pračka": ["pračka", "pračky", "prát", "praní"],
            "lednička": ["lednička", "lednice", "chladnička", "chladit"],
            "myčka": ["myčka", "myčky", "myčka nádobí", "nádobí"],
            "vysavač": ["vysavač", "vysavače", "vysávat", "úklid"]
        }
        
        # Check each category's keywords
        for category, keywords in category_keywords.items():
            if any(keyword in query_lower for keyword in keywords):
                return category
                
        return None
        
    def _process_bike_domain(self, query: str, entities: Dict[str, Any]) -> None:
        """
        Process bike-specific attributes and constraints
        """
        query_lower = query.lower()
        
        # Extract bike type if not already present
        if "bike_type" not in self.attributes:
            bike_types = {
                "horské": "mountain",
                "mtb": "mountain",
                "silniční": "road",
                "městské": "city",
                "trekové": "trekking",
                "dětské": "kids",
                "elektro": "electric",
                "gravel": "gravel"
            }
            
            for keyword, bike_type in bike_types.items():
                if keyword in query_lower:
                    self.attributes["bike_type"] = bike_type
                    break
        
        # Extract wheel size
        wheel_patterns = [
            (r'(\d+)(?:\s*,\s*\d+)?\s*palců', "wheel_size_inches"),
            (r'(\d+)(?:\s*,\s*\d+)?\s*"', "wheel_size_inches"),
            (r'(\d+)(?:\s*,\s*\d+)?\s*palcová', "wheel_size_inches"),
            (r'(\d+)(?:\s*,\s*\d+)?\s*palcové', "wheel_size_inches"),
        ]
        
        for pattern, attr_name in wheel_patterns:
            match = re.search(pattern, query_lower)
            if match:
                self.attributes[attr_name] = float(match.group(1).replace(",", "."))
        
        # Extract bike-specific features if not in entities
        bike_features = {
            "odpružení": ["odpružení", "odpružená vidlice", "tlumiče", "tlumič"],
            "převody": ["převody", "přehazovačka", "řazení", "rychlosti"],
            "brzdy": ["brzdy", "kotoučové brzdy", "diskové brzdy", "hydraulické brzdy"],
            "rám": ["rám", "karbonový", "hliníkový", "ocelový", "karbon", "hliník"],
            "hmotnost": ["hmotnost", "lehké", "váha", "těžké", "kilogramů"]
        }
        
        for feature_name, keywords in bike_features.items():
            if any(keyword in query_lower for keyword in keywords):
                if "bike_features" not in self.attributes:
                    self.attributes["bike_features"] = []
                if feature_name not in self.attributes["bike_features"]:
                    self.attributes["bike_features"].append(feature_name)
        
        # Extract bike use case
        bike_use_cases = {
            "do města": "commuting",
            "na dojíždění": "commuting",
            "do práce": "commuting",
            "do terénu": "off-road",
            "do hor": "mountain",
            "na hory": "mountain",
            "na výlety": "touring",
            "na dlouhé trasy": "touring",
            "do sněhu": "winter",
            "zimní": "winter",
            "na triky": "freestyle",
            "do závodu": "racing"
        }
        
        for keyword, use_case in bike_use_cases.items():
            if keyword in query_lower:
                self.attributes["bike_use_case"] = use_case
                break
                
        # Store size information from entities if available
        if "frame_size" in entities:
            self.attributes["frame_size"] = entities["frame_size"]
            
        # Handle "zimní pneumatiky" special case for the example
        if "zimní pneumatiky" in query_lower or "sněhové pneumatiky" in query_lower:
            if "bike_features" not in self.attributes:
                self.attributes["bike_features"] = []
            if "zimní pneumatiky" not in self.attributes["bike_features"]:
                self.attributes["bike_features"].append("zimní pneumatiky")
                
            # Also add to required features for consistency
            if "zimní pneumatiky" not in self.required_features:
                self.required_features.append("zimní pneumatiky")
                
    def _process_tv_domain(self, query: str, entities: Dict[str, Any]) -> None:
        """
        Process TV-specific attributes and constraints
        """
        query_lower = query.lower()
        
        # Extract screen size
        size_patterns = [
            r'(\d+)(?:\s*,\s*\d+)?\s*palců',
            r'(\d+)(?:\s*,\s*\d+)?\s*"',
            r'(\d+)(?:\s*,\s*\d+)?\s*palcová',
            r'(\d+)(?:\s*,\s*\d+)?\s*palcové',
            r'(\d+)(?:\s*,\s*\d+)?\s*palcový',
        ]
        
        for pattern in size_patterns:
            match = re.search(pattern, query_lower)
            if match:
                self.attributes["screen_size_inches"] = float(match.group(1).replace(",", "."))
                break
        
        # Extract resolution
        resolution_keywords = {
            "4k": "4K", 
            "ultra hd": "4K", 
            "uhd": "4K",
            "full hd": "Full HD", 
            "fhd": "Full HD", 
            "1080p": "Full HD",
            "8k": "8K",
            "hd ready": "HD Ready",
            "720p": "HD Ready"
        }
        
        for keyword, resolution in resolution_keywords.items():
            if keyword in query_lower:
                self.attributes["resolution"] = resolution
                break
        
        # Extract display technology
        display_tech = {
            "oled": "OLED",
            "qled": "QLED",
            "led": "LED",
            "mini led": "Mini LED",
            "lcd": "LCD",
            "plasma": "Plasma"
        }
        
        for keyword, tech in display_tech.items():
            if keyword in query_lower:
                self.attributes["display_technology"] = tech
                break
                
        # Extract smart features
        if "smart" in query_lower or "android" in query_lower:
            self.attributes["smart_tv"] = True
            
        # Extract HDR support
        hdr_types = ["hdr", "hdr10", "hdr10+", "dolby vision", "hlg"]
        for hdr_type in hdr_types:
            if hdr_type in query_lower:
                self.attributes["hdr_support"] = True
                self.attributes["hdr_type"] = hdr_type.upper()
                break
                
        # Extract refresh rate
        refresh_patterns = [r'(\d+)\s*hz']
        for pattern in refresh_patterns:
            match = re.search(pattern, query_lower)
            if match:
                self.attributes["refresh_rate"] = int(match.group(1))
                break
                
    def _process_laptop_domain(self, query: str, entities: Dict[str, Any]) -> None:
        """Process laptop-specific attributes"""
        query_lower = query.lower()
        
        # Extract processor info
        processor_brands = {
            "intel": ["intel", "core i7", "core i5", "core i3", "pentium", "celeron"],
            "amd": ["amd", "ryzen", "athlon"]
        }
        
        for brand, keywords in processor_brands.items():
            if any(keyword in query_lower for keyword in keywords):
                self.attributes["processor_brand"] = brand
                
                # Try to extract processor model
                processor_patterns = [
                    r'i(\d)\s*-\s*(\d{4,5})',  # Intel pattern like i7-10750H
                    r'ryzen\s*(\d)',  # AMD pattern like Ryzen 7
                ]
                
                for pattern in processor_patterns:
                    match = re.search(pattern, query_lower)
                    if match:
                        self.attributes["processor_model"] = match.group(0)
                        break
                break
        
        # Extract RAM
        ram_patterns = [r'(\d+)\s*gb\s*ram', r'ram\s*(\d+)\s*gb']
        for pattern in ram_patterns:
            match = re.search(pattern, query_lower)
            if match:
                self.attributes["ram_gb"] = int(match.group(1))
                break
                
        # Extract storage
        storage_patterns = [
            r'(\d+)\s*gb\s*(?:ssd|hdd|disk|úložiště)',
            r'(\d+)\s*tb\s*(?:ssd|hdd|disk|úložiště)'
        ]
        
        for pattern in storage_patterns:
            match = re.search(pattern, query_lower)
            if match:
                storage_value = int(match.group(1))
                is_tb = "tb" in match.group(0).lower()
                
                if is_tb:
                    storage_value *= 1000  # Convert TB to GB
                
                self.attributes["storage_gb"] = storage_value
                
                # Detect storage type
                if "ssd" in match.group(0).lower():
                    self.attributes["storage_type"] = "SSD"
                elif "hdd" in match.group(0).lower():
                    self.attributes["storage_type"] = "HDD"
                break
                
        # Extract screen size
        size_patterns = [
            r'(\d+(?:\.\d+)?)\s*(?:palců|palcový|")',
            r'(\d+(?:,\d+)?)\s*(?:palců|palcový|")'
        ]
        
        for pattern in size_patterns:
            match = re.search(pattern, query_lower)
            if match:
                size_value = match.group(1).replace(",", ".")
                self.attributes["screen_size_inches"] = float(size_value)
                break
                
        # Extract laptop type/purpose
        laptop_types = {
            "herní": "gaming",
            "na hry": "gaming",
            "pracovní": "business",
            "na práci": "business",
            "kancelářský": "office",
            "do kanceláře": "office",
            "studentský": "student",
            "pro studenty": "student",
            "na cesty": "travel",
            "přenosný": "portable",
            "konvertibilní": "convertible",
            "2v1": "convertible"
        }
        
        for keyword, laptop_type in laptop_types.items():
            if keyword in query_lower:
                self.attributes["laptop_type"] = laptop_type
                break
                
    def _process_smartphone_domain(self, query: str, entities: Dict[str, Any]) -> None:
        """Process smartphone-specific attributes"""
        query_lower = query.lower()
        
        # Common smartphone brands
        brands = ["samsung", "apple", "iphone", "xiaomi", "huawei", "google", "pixel", "oneplus", "sony", "nokia"]
        for brand in brands:
            if brand in query_lower:
                self.attributes["phone_brand"] = brand
                break
                
        # Extract storage capacity
        storage_patterns = [r'(\d+)\s*gb', r'(\d+)\s*tb']
        for pattern in storage_patterns:
            match = re.search(pattern, query_lower)
            if match:
                storage_value = int(match.group(1))
                is_tb = "tb" in match.group(0).lower()
                
                if is_tb:
                    storage_value *= 1000  # Convert TB to GB
                
                self.attributes["storage_gb"] = storage_value
                break
                
        # Extract camera quality
        camera_patterns = [r'(\d+)\s*mpx', r'(\d+)\s*mp', r'(\d+)\s*megapixel']
        for pattern in camera_patterns:
            match = re.search(pattern, query_lower)
            if match:
                self.attributes["camera_mp"] = int(match.group(1))
                break
                
        # Extract screen size
        display_patterns = [r'(\d+(?:\.\d+)?)\s*(?:palců|palcový|")', r'displej\s*(\d+(?:,\d+)?)']
        for pattern in display_patterns:
            match = re.search(pattern, query_lower)
            if match:
                size_value = match.group(1).replace(",", ".")
                self.attributes["screen_size_inches"] = float(size_value)
                break
                
        # Extract operating system
        if "android" in query_lower:
            self.attributes["os"] = "Android"
        elif any(ios_term in query_lower for ios_term in ["ios", "iphone", "apple"]):
            self.attributes["os"] = "iOS"
            
    def _process_washer_domain(self, query: str, entities: Dict[str, Any]) -> None:
        """Process washing machine specific attributes"""
        query_lower = query.lower()
        
        # Extract capacity
        capacity_patterns = [r'(\d+(?:[.,]\d+)?)\s*kg', r'kapacita\s*(\d+(?:[.,]\d+)?)']
        for pattern in capacity_patterns:
            match = re.search(pattern, query_lower)
            if match:
                self.attributes["capacity_kg"] = float(match.group(1).replace(",", "."))
                break
                
        # Extract energy class
        energy_classes = ["a+++", "a++", "a+", "a", "b", "c", "d", "e", "f", "g"]
        energy_patterns = [r'třída\s*([a-g](?:\+{1,3})?)', r'energetická\s*třída\s*([a-g](?:\+{1,3})?)']
        
        # First check patterns
        for pattern in energy_patterns:
            match = re.search(pattern, query_lower)
            if match:
                self.attributes["energy_class"] = match.group(1).upper()
                break
                
        # Then check direct mentions
        if "energy_class" not in self.attributes:
            for energy_class in energy_classes:
                if f"energetická třída {energy_class}" in query_lower or f"třída {energy_class}" in query_lower:
                    self.attributes["energy_class"] = energy_class.upper()
                    break
                    
        # Extract spin speed
        spin_patterns = [r'(\d+)\s*otáček', r'(\d+)\s*ot./min']
        for pattern in spin_patterns:
            match = re.search(pattern, query_lower)
            if match:
                self.attributes["spin_speed"] = int(match.group(1))
                break
                
        # Extract washing machine type
        washer_types = {
            "předem plněná": "front_load",
            "předem": "front_load",
            "zepředu": "front_load",
            "vrchem plněná": "top_load",
            "vrchem": "top_load",
            "shora": "top_load",
            "slim": "slim",
            "úzká": "slim",
            "pračka se sušičkou": "washer_dryer",
            "kombinovaná": "washer_dryer",
            "s funkcí sušičky": "washer_dryer"
        }
        
        for phrase, washer_type in washer_types.items():
            if phrase in query_lower:
                self.attributes["washer_type"] = washer_type
                break
                
    def _process_generic_domain(self, query: str, entities: Dict[str, Any]) -> None:
        """
        Process entities for any product domain with general attribute extraction
        """
        query_lower = query.lower()
        
        # Generic attribute extraction for any domain
        # Extract size dimensions (width, height, depth)
        dimension_patterns = [
            (r'(\d+(?:[.,]\d+)?)\s*cm\s*(?:široký|široká|široké|šířka)', "width_cm"),
            (r'šířka\s*(\d+(?:[.,]\d+)?)\s*cm', "width_cm"),
            (r'(\d+(?:[.,]\d+)?)\s*cm\s*(?:vysoký|vysoká|vysoké|výška)', "height_cm"),
            (r'výška\s*(\d+(?:[.,]\d+)?)\s*cm', "height_cm"),
            (r'(\d+(?:[.,]\d+)?)\s*cm\s*(?:hluboký|hluboká|hluboké|hloubka)', "depth_cm"),
            (r'hloubka\s*(\d+(?:[.,]\d+)?)\s*cm', "depth_cm")
        ]
        
        for pattern, attr_name in dimension_patterns:
            match = re.search(pattern, query_lower)
            if match:
                self.attributes[attr_name] = float(match.group(1).replace(",", "."))
                
        # Extract weight
        weight_patterns = [r'(\d+(?:[.,]\d+)?)\s*kg', r'váha\s*(\d+(?:[.,]\d+)?)\s*kg', r'hmotnost\s*(\d+(?:[.,]\d+)?)\s*kg']
        for pattern in weight_patterns:
            match = re.search(pattern, query_lower)
            if match:
                self.attributes["weight_kg"] = float(match.group(1).replace(",", "."))
                break
                
        # Extract energy consumption
        energy_patterns = [r'(\d+(?:[.,]\d+)?)\s*kwh', r'spotřeba\s*(\d+(?:[.,]\d+)?)\s*kwh']
        for pattern in energy_patterns:
            match = re.search(pattern, query_lower)
            if match:
                self.attributes["energy_consumption_kwh"] = float(match.group(1).replace(",", "."))
                break
                
        # Extract warranty period
        warranty_patterns = [r'(\d+)\s*(?:letá|rok|roků|roky|let)\s*záruka', r'záruka\s*(\d+)\s*(?:letá|rok|roků|roky|let)']
        for pattern in warranty_patterns:
            match = re.search(pattern, query_lower)
            if match:
                self.attributes["warranty_years"] = int(match.group(1))
                break
                
        # Extract material
        materials = {
            "dřevěný": "wood",
            "dřevo": "wood",
            "kovový": "metal",
            "kov": "metal",
            "ocelový": "steel",
            "ocel": "steel",
            "plastový": "plastic",
            "plast": "plastic",
            "skleněný": "glass",
            "sklo": "glass",
            "hliníkový": "aluminum",
            "hliník": "aluminum",
            "karbonový": "carbon",
            "karbon": "carbon"
        }
        
        for keyword, material in materials.items():
            if keyword in query_lower:
                self.attributes["material"] = material
                break
                
        # Extract connectivity features
        connectivity_features = [
            "wifi", "wi-fi", "bluetooth", "nfc", "usb", "hdmi", 
            "bezdrátové připojení", "bezdrátový", "online"
        ]
        
        for feature in connectivity_features:
            if feature in query_lower:
                if "connectivity" not in self.attributes:
                    self.attributes["connectivity"] = []
                if feature not in self.attributes["connectivity"]:
                    self.attributes["connectivity"].append(feature)
                    
    def _resolve_attribute_conflicts(self) -> None:
        """
        Resolve conflicts between contradictory attributes
        """
        # Example: Price range conflicts
        if "budget_range" in self.__dict__ and self.budget_range:
            min_price = self.budget_range.get("min")
            max_price = self.budget_range.get("max")
            
            # Only compare if both values are not None
            if min_price is not None and max_price is not None:
                if min_price > max_price and max_price < 9999999:  # Using 9999999 instead of infinity
                    # Swap min and max if they're in the wrong order
                    self.budget_range["min"], self.budget_range["max"] = max_price, min_price
                    logger.debug(f"Resolved conflicting price range: {min_price}->{max_price}")
            
            # Ensure we have proper defaults for None values
            if min_price is None:
                self.budget_range["min"] = 0
            if max_price is None:
                self.budget_range["max"] = 9999999  # Using a large finite number instead of infinity

            
    def _update_attribute_dependencies(self) -> None:
        """
        Update dependent attributes based on primary attributes
        """
        # Example: Bike type infers typical use cases
        if "bike_type" in self.attributes:
            bike_type = self.attributes["bike_type"]
            
            # Set default use case if none specified
            if "bike_use_case" not in self.attributes:
                use_case_map = {
                    "mountain": "off-road",
                    "road": "racing",
                    "city": "commuting",
                    "trekking": "touring",
                    "kids": "leisure",
                    "electric": "commuting"
                }
                
                if bike_type in use_case_map:
                    self.attributes["bike_use_case"] = use_case_map[bike_type]
                    logger.debug(f"Inferred use case '{use_case_map[bike_type]}' from bike type '{bike_type}'")
                    
        # Example: Screen size infers device category in some cases
        if "screen_size_inches" in self.attributes and "category" not in self.attributes:
            screen_size = self.attributes["screen_size_inches"]
            
            if screen_size <= 7:
                self.attributes["likely_category"] = "tablet"
            elif screen_size <= 17:
                self.attributes["likely_category"] = "notebook"
            elif screen_size > 17:
                self.attributes["likely_category"] = "televize"
                
            logger.debug(f"Inferred likely category '{self.attributes['likely_category']}' from screen size {screen_size}\"")
            
    def get_readable_summary(self) -> str:
        """
        Get a human-readable summary of the current context
        """
        # Build the base summary with common attributes
        summary_parts = []
        
        if self.category:
            summary_parts.append(f"kategorie: {self.category}")
            
        if self.subcategory:
            summary_parts.append(f"podkategorie: {self.subcategory}")
            
        if self.budget_range:
            price_range = ""
            if "min" in self.budget_range:
                price_range += f"od {self.budget_range['min']} Kč"
            if "max" in self.budget_range:
                if price_range:
                    price_range += " "
                price_range += f"do {self.budget_range['max']} Kč"
                
            if price_range:
                summary_parts.append(f"cenové rozpětí: {price_range}")
                
        if self.required_features:
            summary_parts.append(f"požadované funkce: {', '.join(self.required_features)}")
            
        # Add other relevant attributes
        for key, value in self.attributes.items():
            # Skip attributes we've already included
            if key in ("category", "subcategory", "price_range", "required_features"):
                continue
                
            # Format the attribute value
            if isinstance(value, list):
                formatted_value = ", ".join(str(item) for item in value)
            elif isinstance(value, dict):
                formatted_value = json.dumps(value, ensure_ascii=False)
            else:
                formatted_value = str(value)
                
            summary_parts.append(f"{key}: {formatted_value}")
            
        return "; ".join(summary_parts)
        
    def get_structured_context(self) -> Dict[str, Any]:
        """
        Returns a structured representation of the current context
        """
        context = {
            "basic_info": {
                "category": self.category,
                "subcategory": self.subcategory,
                "budget_range": self.budget_range,
                "last_updated": self.last_updated.isoformat() if isinstance(self.last_updated, datetime) else self.last_updated,
            },
            "constraints": {
                "features": self.required_features,
                "colors": self.attributes.get("colors", []),
                "brand": self.attributes.get("brand"),
                "materials": self.attributes.get("material"),
            },
            "product_attributes": {},
            "user_preferences": {},
            "conversation_status": {
                "query_count": len(self.previous_queries),
                "intent_history": self.previous_intents[-3:] if self.previous_intents else []
            }
        }
        
        # Organize domain-specific attributes
        domain_attributes = {}
        
        # Handle TV specific attributes
        tv_attributes = ["display_technology", "resolution", "screen_size_inches", 
                        "smart_tv", "hdr_support", "refresh_rate"]
        
        # Handle computer/laptop specific attributes  
        computer_attributes = ["processor_brand", "processor_model", "ram_gb", 
                             "storage_gb", "    storage_type", "laptop_type"]
        
        # Handle bike specific attributes
        bike_attributes = ["bike_type", "bike_use_case", "wheel_size_inches", 
                         "frame_size", "bike_features"]
        
        # Handle smartphone attributes
        phone_attributes = ["phone_brand", "os", "camera_mp", "screen_size_inches"]
        
        # Handle washer attributes
        washer_attributes = ["capacity_kg", "energy_class", "spin_speed", "washer_type"]
        
        # Group domain-specific attributes
        all_domain_attrs = {
            "tv": tv_attributes,
            "computer": computer_attributes,
            "bike": bike_attributes,
            "phone": phone_attributes,
            "washer": washer_attributes
        }
        
        # Find which domain the attributes match best
        for domain, attrs in all_domain_attrs.items():
            for attr in attrs:
                if attr in self.attributes:
                    if domain not in domain_attributes:
                        domain_attributes[domain] = {}
                    domain_attributes[domain][attr] = self.attributes[attr]
        
        # Add domain attributes to product attributes
        context["product_attributes"] = domain_attributes
        
        # Add user preferences if any
        if "preferences" in self.attributes:
            context["user_preferences"]["preferences"] = self.attributes["preferences"]
        
        # Add use case if any
        if "use_case" in self.attributes or "bike_use_case" in self.attributes:
            context["user_preferences"]["use_case"] = self.attributes.get("use_case") or self.attributes.get("bike_use_case")
            
        # Add quality preferences
        if "quality_criteria" in self.attributes:
            context["user_preferences"]["quality_criteria"] = self.attributes["quality_criteria"]
            
        return context

    def generate_filter_query(self) -> Dict[str, Any]:
        """
        Generates a MongoDB filter query based on the current context
        """
        query = {}
        
        # Add category filter
        if self.category:
            query["category"] = self.category
            
        # Add subcategory filter if it exists
        if self.subcategory:
            query["subcategory"] = self.subcategory
            
        # Add brand filter if specified
        if "brand" in self.attributes:
            query["brand"] = {"$regex": self.attributes["brand"], "$options": "i"}
            
        # Add color filter
        if "colors" in self.attributes and self.attributes["colors"]:
            query["colors"] = {"$in": self.attributes["colors"]}
            
        # Add price range filter
        if self.budget_range:
            price_filter = {}
            if "min" in self.budget_range:
                price_filter["$gte"] = self.budget_range["min"]
            if "max" in self.budget_range:
                price_filter["$lte"] = self.budget_range["max"]
                
            if price_filter:
                query["price"] = price_filter
                
        # Add feature filters
        if self.required_features:
            query["features"] = {"$all": self.required_features}
            
        # Add domain-specific filters based on attributes
        if self.category == "kolo" or "bike_type" in self.attributes:
            # Bike-specific filters
            if "bike_type" in self.attributes:
                query["bike_type"] = self.attributes["bike_type"]
                
            if "wheel_size_inches" in self.attributes:
                query["wheel_size"] = self.attributes["wheel_size_inches"]
                
            if "bike_features" in self.attributes and self.attributes["bike_features"]:
                if "features" not in query:
                    query["features"] = {"$all": self.attributes["bike_features"]}
                else:
                    query["features"]["$all"].extend(self.attributes["bike_features"])
                    
        elif self.category == "televize" or "screen_size_inches" in self.attributes:
            # TV-specific filters
            if "screen_size_inches" in self.attributes:
                size = self.attributes["screen_size_inches"]
                # Usually people want TVs at least the size they specify, or slightly larger
                query["screen_size"] = {"$gte": size, "$lte": size + 5}
                
            if "display_technology" in self.attributes:
                query["display_technology"] = self.attributes["display_technology"]
                
            if "resolution" in self.attributes:
                query["resolution"] = self.attributes["resolution"]
                
            if "smart_tv" in self.attributes and self.attributes["smart_tv"]:
                query["smart_tv"] = True
                
            if "refresh_rate" in self.attributes:
                query["refresh_rate"] = {"$gte": self.attributes["refresh_rate"]}
                
        elif self.category == "notebook" or "laptop_type" in self.attributes:
            # Laptop-specific filters
            if "processor_brand" in self.attributes:
                query["processor.brand"] = self.attributes["processor_brand"]
                
            if "ram_gb" in self.attributes:
                query["ram.size"] = {"$gte": self.attributes["ram_gb"]}
                
            if "storage_gb" in self.attributes:
                query["storage.size"] = {"$gte": self.attributes["storage_gb"]}
                
            if "storage_type" in self.attributes:
                query["storage.type"] = self.attributes["storage_type"]
                
            if "laptop_type" in self.attributes:
                query["type"] = self.attributes["laptop_type"]
                
        elif self.category == "smartphone" or "phone_brand" in self.attributes:
            # Smartphone-specific filters
            if "phone_brand" in self.attributes:
                query["brand"] = self.attributes["phone_brand"]
                
            if "os" in self.attributes:
                query["operating_system"] = self.attributes["os"]
                
            if "camera_mp" in self.attributes:
                query["camera.main"] = {"$gte": self.attributes["camera_mp"]}
                
            if "storage_gb" in self.attributes:
                query["storage"] = {"$gte": self.attributes["storage_gb"]}
                
        elif self.category == "pračka" or "washer_type" in self.attributes:
            # Washer-specific filters
            if "capacity_kg" in self.attributes:
                query["capacity"] = {"$gte": self.attributes["capacity_kg"]}
                
            if "energy_class" in self.attributes:
                query["energy_class"] = self.attributes["energy_class"]
                
            if "spin_speed" in self.attributes:
                query["spin_speed"] = {"$gte": self.attributes["spin_speed"]}
                
            if "washer_type" in self.attributes:
                query["type"] = self.attributes["washer_type"]
                
        return query

    def reset_constraints(self) -> None:
        """
        Resets all constraints but keeps conversation history.
        """
        self.category = None
        self.subcategory = None
        self.budget_range = {}
        self.required_features = []
        
        # Clear all domain-specific attributes but keep conversation history
        keys_to_keep = ["previous_queries", "previous_intents", "entity_history", "confidence_levels"]
        keys_to_remove = [k for k in self.attributes.keys() if k not in keys_to_keep]
        
        for key in keys_to_remove:
            if key in self.attributes:
                del self.attributes[key]
                
        logger.info("Reset all context constraints")

    def has_sufficient_constraints(self) -> bool:
        """
        Determines if there are enough constraints to make a meaningful recommendation.
        """
        constraint_count = 0
        constraint_types = 0
        
        # Core constraints
        if self.category:
            constraint_count += 1
            constraint_types += 1
            
        if self.subcategory:
            constraint_count += 1
            
        if self.budget_range:
            constraint_count += 1
            constraint_types += 1
            
        if self.required_features:
            constraint_count += len(self.required_features)
            constraint_types += 1
            
        # Domain-specific constraints
        for domain in ["bike_type", "display_technology", "processor_brand", 
                      "phone_brand", "washer_type"]:
            if domain in self.attributes:
                constraint_count += 1
                
        # Color constraints
        if "colors" in self.attributes and self.attributes["colors"]:
            constraint_count += len(self.attributes["colors"])
            constraint_types += 1
            
        # Check if we have enough diversity in constraint types and enough total constraints
        return constraint_types >= 2 and constraint_count >= 3