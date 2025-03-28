# app/services/knowledge_base.py
import yaml
import os
import re
from typing import Dict, List, Optional, Any, Tuple, Set
from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.logging_config import get_module_logger
from app.utils.mongo import get_product_collection, get_qa_collection
from bson import ObjectId

logger = get_module_logger(__name__)

class KnowledgeBase:
    """
    Enhanced knowledge base for retrieving and managing structured information about products, 
    categories, accessories, Q&A pairs, templates, and common phrases.
    """
    
    def __init__(self, db: AsyncIOMotorClient):
        self.db = db
        self.product_collection = None
        self.qa_collection = None
        self.products_cache = {}
        self.categories_cache = {}
        self.templates_cache = {}
        self.common_phrases_cache = {}
        self.logger = logger
        
        # Set up feature-based indexes for faster searching
        self.feature_index = {}
        self.brand_index = {}
        self.price_index = {}
        self.category_index = {}
        
        # Enhanced synonym system for better matching
        self.synonyms = {
            "smartphone": ["telefon", "mobil", "chytrý telefon", "phone"],
            "notebook": ["laptop", "počítač", "počítače", "notebooky", "pc"],
            "televize": ["tv", "televizor", "televizory", "smart tv", "chytrá televize"],
            "kolo": ["jízdní kolo", "bicykl", "bike"],
            "pračka": ["myčka", "pračky", "prádelní automat"],
            # Add more synonyms as needed
        }
        
        # Compatibility matrix for accessories
        self.compatibility_matrix = {
            "smartphone": ["phone_case", "screen_protector", "charger", "headphones", "power_bank"],
            "notebook": ["laptop_bag", "mouse", "keyboard", "docking_station", "cooling_pad"],
            "televize": ["tv_mount", "hdmi_cable", "remote_control", "soundbar", "cleaning_kit"],
            "kolo": ["helmet", "bike_lock", "bike_light", "pump", "bike_tools"],
            # Add more compatibility mappings
        }
    
    async def initialize_collections(self):
        """Initialize database collections and load cached data."""
        self.product_collection = await get_product_collection()
        self.qa_collection = await get_qa_collection()
        await self.load_caches()
        await self.build_indexes()
    
    async def load_caches(self):
        """Load data from database into memory caches with improved error handling."""
        self.logger.info("Loading enhanced knowledge base caches...")
        try:
            await self.load_products_cache()
            await self.load_qa_cache()
            self.logger.info("Knowledge base caches loaded successfully.")
        except Exception as e:
            self.logger.error(f"Error loading caches: {str(e)}")
    
    async def load_products_cache(self):
        """Load products from database into memory cache with optimization."""
        if self.product_collection is None:
            self.logger.error("Product collection not initialized")
            return
            
        try:
            # Use projection to load only essential fields for the cache
            essential_fields = {
                "product_name": 1, 
                "category": 1, 
                "features": 1, 
                "pricing": 1,
                "brand": 1,
                "admin_priority": 1
            }
            
            cursor = self.product_collection.find({}, essential_fields)
            products = await cursor.to_list(length=None)
            
            # Store in cache with ID as key
            self.products_cache = {str(product["_id"]): product for product in products}
            
            self.logger.info(f"Loaded {len(self.products_cache)} products into cache")
        except Exception as e:
            self.logger.error(f"Error loading products cache: {str(e)}")
    
    async def load_qa_cache(self):
        """Load QA items, categories, templates from database with improved structure."""
        if self.qa_collection is None:
            self.logger.error("QA collection not initialized")
            return
            
        try:
            # Get categories
            categories_cursor = self.qa_collection.find({"type": "category"})
            categories = await categories_cursor.to_list(length=None)
            self.categories_cache = {item["category"]: item for item in categories}
            
            # Get templates
            templates_cursor = self.qa_collection.find({"type": "template"})
            templates = await templates_cursor.to_list(length=None)
            self.templates_cache = {item["intent"]: item["content"] for item in templates}
            
            # Get common phrases
            phrases_cursor = self.qa_collection.find({"type": "phrase"})
            phrases = await phrases_cursor.to_list(length=None)
            self.common_phrases_cache = {item["key"]: item["content"] for item in phrases}
            
            self.logger.info(f"Loaded QA cache: {len(self.categories_cache)} categories, " 
                            f"{len(self.templates_cache)} templates, "
                            f"{len(self.common_phrases_cache)} common phrases")
        except Exception as e:
            self.logger.error(f"Error loading QA cache: {str(e)}")
    
    async def build_indexes(self):
        """Build in-memory indexes for faster searching."""
        self.logger.info("Building in-memory feature indexes...")
        
        try:
            # Reset indexes
            self.feature_index = {}
            self.brand_index = {}
            self.price_index = {}
            self.category_index = {}
            
            # Process each product
            for product_id, product in self.products_cache.items():
                # Index by features
                for feature in product.get("features", []):
                    feature_key = feature.lower()
                    if feature_key not in self.feature_index:
                        self.feature_index[feature_key] = []
                    self.feature_index[feature_key].append(product_id)
                
                # Index by brand
                if "brand" in product:
                    brand_key = product["brand"].lower()
                    if brand_key not in self.brand_index:
                        self.brand_index[brand_key] = []
                    self.brand_index[brand_key].append(product_id)
                
                # Index by price ranges (in 1000 CZK increments)
                price = self._get_price_value(product)
                if price is not None:
                    price_range = int(price / 1000) * 1000  # Group by 1000s
                    if price_range not in self.price_index:
                        self.price_index[price_range] = []
                    self.price_index[price_range].append(product_id)
                
                # Index by category
                if "category" in product:
                    category_key = product["category"].lower()
                    if category_key not in self.category_index:
                        self.category_index[category_key] = []
                    self.category_index[category_key].append(product_id)
                    
                    # Also index by category synonyms
                    for category, synonyms in self.synonyms.items():
                        if category_key == category.lower():
                            for synonym in synonyms:
                                synonym_key = synonym.lower()
                                if synonym_key not in self.category_index:
                                    self.category_index[synonym_key] = []
                                self.category_index[synonym_key].append(product_id)
            
            self.logger.info(f"Built indexes: {len(self.feature_index)} features, " 
                           f"{len(self.brand_index)} brands, "
                           f"{len(self.price_index)} price ranges, "
                           f"{len(self.category_index)} categories")
        except Exception as e:
            self.logger.error(f"Error building indexes: {str(e)}")
    
    async def find_product_by_id(self, product_id: str) -> Optional[Dict]:
        """Find a product by its ID with enhanced error handling."""
        try:
            # First check cache
            if product_id in self.products_cache:
                return self.products_cache[product_id]
                
            # If not in cache, check database
            if ObjectId.is_valid(product_id):
                product = await self.product_collection.find_one({"_id": ObjectId(product_id)})
                if product:
                    # Update cache
                    self.products_cache[str(product["_id"])] = product
                    return product
            
            return None
        except Exception as e:
            self.logger.error(f"Error finding product by ID {product_id}: {str(e)}")
            return None
    
    async def find_products_by_name(self, product_name: str, limit: int = 5) -> List[Dict]:
        """Find products by name using enhanced text search."""
        try:
            # Prepare query terms
            name_terms = product_name.lower().split()
            
            # Check if using exact product name
            cursor = self.product_collection.find(
                {"$text": {"$search": product_name}},
                {"score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).limit(limit)
            
            products = await cursor.to_list(length=limit)
            
            # If no direct hits, try partial matching
            if not products:
                # Create regex for partial matching
                name_pattern = '|'.join([re.escape(term) for term in name_terms])
                cursor = self.product_collection.find(
                    {"product_name": {"$regex": name_pattern, "$options": "i"}}
                ).limit(limit)
                
                products = await cursor.to_list(length=limit)
            
            # Add products to cache
            for product in products:
                self.products_cache[str(product["_id"])] = product
                
            return products
        except Exception as e:
            self.logger.error(f"Error finding products by name '{product_name}': {str(e)}")
            return []
    
    async def find_products_by_category(self, category: str, limit: int = 10) -> List[Dict]:
        """Find products by category with synonym support."""
        try:
            category_lower = category.lower()
            
            # First check for direct category match
            query = {"category": {"$regex": f"^{re.escape(category)}$", "$options": "i"}}
            
            # Check for synonyms
            synonyms = []
            for cat, syns in self.synonyms.items():
                if category_lower == cat.lower() or category_lower in [s.lower() for s in syns]:
                    synonyms.extend([cat] + syns)
            
            # If synonyms found, expand query
            if synonyms:
                synonym_patterns = [f"^{re.escape(syn)}$" for syn in synonyms]
                query = {"category": {"$regex": '|'.join(synonym_patterns), "$options": "i"}}
            
            # Find products with query
            cursor = self.product_collection.find(query).sort([("admin_priority", -1)]).limit(limit)
            products = await cursor.to_list(length=limit)
            
            # Add products to cache
            for product in products:
                self.products_cache[str(product["_id"])] = product
                
            return products
        except Exception as e:
            self.logger.error(f"Error finding products by category '{category}': {str(e)}")
            return []
    
    async def find_products_by_query(self, 
                                  query: Dict[str, Any], 
                                  limit: int = 10,
                                  sort_by: str = None,
                                  sort_direction: int = 1) -> List[Dict]:
        """Find products by custom query with improved sorting."""
        try:
            # Default sort by admin priority if not specified
            sort_options = sort_by if sort_by else {"admin_priority": -1}
            
            # Ensure sort is in correct format
            if isinstance(sort_options, str):
                sort_options = {sort_options: sort_direction}
                
            # Execute query
            cursor = self.product_collection.find(query)
            
            # Apply sorting
            if sort_options:
                if isinstance(sort_options, dict):
                    cursor = cursor.sort(list(sort_options.items()))
                else:
                    cursor = cursor.sort(sort_options)
                
            # Apply limit
            cursor = cursor.limit(limit)
            
            # Get products
            products = await cursor.to_list(length=limit)
            
            # Add products to cache
            for product in products:
                self.products_cache[str(product["_id"])] = product
                
            return products
        except Exception as e:
            self.logger.error(f"Error finding products by query {query}: {str(e)}")
            return []
    
    def get_template(self, intent: str) -> Optional[str]:
        """Get a response template for a specific intent."""
        return self.templates_cache.get(intent)
    
    def get_common_phrase(self, key: str) -> Optional[str]:
        """Get a common phrase by key."""
        return self.common_phrases_cache.get(key)
    
    def get_category_info(self, category: str) -> Optional[Dict]:
        """Get category information including synonyms."""
        # Check direct match
        if category.lower() in [k.lower() for k in self.categories_cache.keys()]:
            for k, v in self.categories_cache.items():
                if k.lower() == category.lower():
                    return v
        
        # Check synonyms
        for cat, syns in self.synonyms.items():
            if category.lower() in [s.lower() for s in syns] and cat.lower() in [k.lower() for k in self.categories_cache.keys()]:
                for k, v in self.categories_cache.items():
                    if k.lower() == cat.lower():
                        return v
        
        return None
    
    async def search_products(self, 
                           query: str, 
                           filters: Dict[str, Any] = None,
                           limit: int = 5) -> List[Dict]:
        """
        Search for products using text search with enhanced filtering options.
        
        Args:
            query: The search query text
            filters: Optional MongoDB query filters
            limit: Maximum number of results to return
            
        Returns:
            List of matching products
        """
        try:
            # Build the search query
            search_query = {"$text": {"$search": query}}
            
            # Add filters if provided
            if filters:
                search_query.update(filters)
            
            # Execute the search
            cursor = self.product_collection.find(
                search_query,
                {"score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"}), ("admin_priority", -1)]).limit(limit)
            
            # Collect results
            results = []
            async for product in cursor:
                # Update cache
                self.products_cache[str(product["_id"])] = product
                results.append(product)
            
            # If no direct text search results, try regex-based search with terms
            if not results:
                terms = query.lower().split()
                if terms:
                    term_patterns = [f"(?i){re.escape(term)}" for term in terms]
                    term_query = {
                        "$or": [
                            {"product_name": {"$regex": '|'.join(term_patterns)}},
                            {"description": {"$regex": '|'.join(term_patterns)}},
                            {"features": {"$elemMatch": {"$regex": '|'.join(term_patterns)}}}
                        ]
                    }
                    
                    # Add filters if provided
                    if filters:
                        for key, value in filters.items():
                            term_query[key] = value
                    
                    # Execute the regex search
                    regex_cursor = self.product_collection.find(term_query).sort([("admin_priority", -1)]).limit(limit)
                    
                    # Collect results
                    async for product in regex_cursor:
                        # Update cache
                        self.products_cache[str(product["_id"])] = product
                        results.append(product)
            
            return results
        except Exception as e:
            self.logger.error(f"Error searching products with query '{query}': {str(e)}")
            return []
    
    async def get_product_comparison(self, 
                                 product1_id: str, 
                                 product2_id: str) -> Dict[str, Any]:
        """
        Get detailed comparison between two products with enhanced comparison logic.
        
        Args:
            product1_id: ID of first product
            product2_id: ID of second product
            
        Returns:
            Dictionary with comprehensive comparison data
        """
        try:
            product1 = await self.find_product_by_id(product1_id)
            product2 = await self.find_product_by_id(product2_id)
            
            if not product1 or not product2:
                return {"error": "One or both products not found"}
            
            # Basic comparison data
            comparison = {
                "products": [product1, product2],
                "common_features": [],
                "unique_features": {
                    product1["product_name"]: [],
                    product2["product_name"]: []
                },
                "price_difference": 0,
                "price_comparison": "",
                "technical_comparison": {},
                "pros_cons": {
                    product1["product_name"]: {"pros": [], "cons": []},
                    product2["product_name"]: {"pros": [], "cons": []}
                },
                "overall_recommendation": ""
            }
            
            # Calculate price difference
            price1 = self._get_price_value(product1)
            price2 = self._get_price_value(product2)
            if price1 and price2:
                comparison["price_difference"] = abs(price1 - price2)
                
                # Add price comparison text
                if price1 < price2:
                    comparison["price_comparison"] = f"{product1['product_name']} is {round((price2 - price1) / price1 * 100)}% cheaper than {product2['product_name']}"
                elif price2 < price1:
                    comparison["price_comparison"] = f"{product2['product_name']} is {round((price1 - price2) / price2 * 100)}% cheaper than {product1['product_name']}"
                else:
                    comparison["price_comparison"] = "Both products have the same price"
            
            # Compare features
            features1 = set(product1.get("features", []))
            features2 = set(product2.get("features", []))
            
            comparison["common_features"] = list(features1.intersection(features2))
            comparison["unique_features"][product1["product_name"]] = list(features1 - features2)
            comparison["unique_features"][product2["product_name"]] = list(features2 - features1)
            
            # Compare technical specifications if available
            tech_specs1 = product1.get("technical_specifications", {})
            tech_specs2 = product2.get("technical_specifications", {})
            
            if tech_specs1 and tech_specs2:
                # Find all spec keys
                all_specs = set(tech_specs1.keys()).union(set(tech_specs2.keys()))
                
                for spec in all_specs:
                    comparison["technical_comparison"][spec] = {
                        product1["product_name"]: tech_specs1.get(spec, "N/A"),
                        product2["product_name"]: tech_specs2.get(spec, "N/A")
                    }
            
            # Add pros and cons if available
            if product1.get("pros"):
                comparison["pros_cons"][product1["product_name"]]["pros"] = product1.get("pros", [])
            if product1.get("cons"):
                comparison["pros_cons"][product1["product_name"]]["cons"] = product1.get("cons", [])
            if product2.get("pros"):
                comparison["pros_cons"][product2["product_name"]]["pros"] = product2.get("pros", [])
            if product2.get("cons"):
                comparison["pros_cons"][product2["product_name"]]["cons"] = product2.get("cons", [])
            
            # Generate basic recommendation text
            if price1 and price2 and features1 and features2:
                if price1 < price2 and len(features1) >= len(features2):
                    comparison["overall_recommendation"] = f"{product1['product_name']} offers better value for money"
                elif price2 < price1 and len(features2) >= len(features1):
                    comparison["overall_recommendation"] = f"{product2['product_name']} offers better value for money"
                elif price1 < price2:
                    comparison["overall_recommendation"] = f"{product1['product_name']} is more affordable, but {product2['product_name']} offers more features"
                elif price2 < price1:
                    comparison["overall_recommendation"] = f"{product2['product_name']} is more affordable, but {product1['product_name']} offers more features"
                else:
                    if len(features1) > len(features2):
                        comparison["overall_recommendation"] = f"{product1['product_name']} offers more features at the same price"
                    elif len(features2) > len(features1):
                        comparison["overall_recommendation"] = f"{product2['product_name']} offers more features at the same price"
                    else:
                        comparison["overall_recommendation"] = "Both products offer similar value"
            
            return comparison
        except Exception as e:
            self.logger.error(f"Error comparing products {product1_id} and {product2_id}: {str(e)}")
            return {"error": f"Error comparing products: {str(e)}"}
    
    def _get_price_value(self, product: Dict) -> Optional[float]:
        """Extract the price value from a product dictionary."""
        pricing = product.get("pricing", {})
        
        # Try different price types
        for price_type in ["one_time", "value", "monthly", "annual"]:
            price = pricing.get(price_type)
            if price:
                # Convert to float if it's a string
                if isinstance(price, str):
                    try:
                        return float(price.replace(" ", "").replace(",", "."))
                    except ValueError:
                        pass
                return float(price)
        
        return None
    
    async def update_product(self, product_id: str, updates: Dict[str, Any]) -> Optional[Dict]:
        """Update a product in the database and cache."""
        try:
            if ObjectId.is_valid(product_id):
                result = await self.product_collection.update_one(
                    {"_id": ObjectId(product_id)},
                    {"$set": updates}
                )
                
                if result.modified_count > 0:
                    # Get the updated product
                    updated_product = await self.product_collection.find_one(
                        {"_id": ObjectId(product_id)}
                    )
                    
                    # Update cache
                    if updated_product:
                        self.products_cache[str(updated_product["_id"])] = updated_product
                        
                        # Update indexes for this product
                        await self.update_indexes_for_product(str(updated_product["_id"]), updated_product)
                        
                        return updated_product
            
            return None
        except Exception as e:
            self.logger.error(f"Error updating product {product_id}: {e}")
            return None
    
    async def update_indexes_for_product(self, product_id: str, product: Dict):
        """Update in-memory indexes for a specific product."""
        try:
            # Remove product from existing indexes
            for feature_products in self.feature_index.values():
                if product_id in feature_products:
                    feature_products.remove(product_id)
            
            for brand_products in self.brand_index.values():
                if product_id in brand_products:
                    brand_products.remove(product_id)
            
            for price_products in self.price_index.values():
                if product_id in price_products:
                    price_products.remove(product_id)
            
            for category_products in self.category_index.values():
                if product_id in category_products:
                    category_products.remove(product_id)
            
            # Add product to indexes
            # Index by features
            for feature in product.get("features", []):
                feature_key = feature.lower()
                if feature_key not in self.feature_index:
                    self.feature_index[feature_key] = []
                self.feature_index[feature_key].append(product_id)
            
            # Index by brand
            if "brand" in product:
                brand_key = product["brand"].lower()
                if brand_key not in self.brand_index:
                    self.brand_index[brand_key] = []
                self.brand_index[brand_key].append(product_id)
            
            # Index by price ranges
            price = self._get_price_value(product)
            if price is not None:
                price_range = int(price / 1000) * 1000  # Group by 1000s
                if price_range not in self.price_index:
                    self.price_index[price_range] = []
                self.price_index[price_range].append(product_id)
            
            # Index by category
            if "category" in product:
                category_key = product["category"].lower()
                if category_key not in self.category_index:
                    self.category_index[category_key] = []
                self.category_index[category_key].append(product_id)
        except Exception as e:
            self.logger.error(f"Error updating indexes for product {product_id}: {str(e)}")
    
    async def get_recommended_products(self, limit: int = 5) -> List[Dict]:
        """Get recommended products based on admin priority and popularity."""
        try:
            # Query for recommended products with high admin priority
            cursor = self.product_collection.find(
                {"admin_priority": {"$gt": 0}}
            ).sort([("admin_priority", -1)]).limit(limit)
            
            recommended = []
            async for product in cursor:
                self.products_cache[str(product["_id"])] = product
                recommended.append(product)
            
            # If not enough recommended products, get popular ones
            if len(recommended) < limit:
                remaining = limit - len(recommended)
                recommended_ids = [str(p["_id"]) for p in recommended]
                
                popular_cursor = self.product_collection.find(
                    {"_id": {"$nin": [ObjectId(pid) for pid in recommended_ids]}}
                ).sort([("metrics.user_satisfaction", -1)]).limit(remaining)
                
                async for product in popular_cursor:
                    self.products_cache[str(product["_id"])] = product
                    recommended.append(product)
            
            return recommended
        except Exception as e:
            self.logger.error(f"Error getting recommended products: {str(e)}")
            return []
    
    async def find_qa_items_by_keyword(self, keyword: str, limit: int = 5) -> List[Dict]:
        """Find QA items by keyword."""
        try:
            # Search for QA items containing the keyword
            cursor = self.qa_collection.find(
                {
                    "$or": [
                        {"question": {"$regex": f"(?i){re.escape(keyword)}"}},
                        {"answer": {"$regex": f"(?i){re.escape(keyword)}"}},
                        {"keywords": {"$in": [keyword.lower()]}}
                    ],
                    "type": {"$ne": "category"},  # Exclude categories
                    "type": {"$ne": "template"},  # Exclude templates
                    "type": {"$ne": "phrase"}     # Exclude phrases
                }
            ).limit(limit)
            
            return await cursor.to_list(length=limit)
        except Exception as e:
            self.logger.error(f"Error finding QA items for keyword '{keyword}': {str(e)}")
            return []