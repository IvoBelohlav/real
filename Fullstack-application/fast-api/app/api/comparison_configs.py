from fastapi import APIRouter, HTTPException, Depends
from app.utils.mongo import get_comparison_configs_collection, create_comparison_config, get_comparison_config, update_comparison_config, delete_comparison_config, get_all_comparison_configs
from app.models.models import ComparisonConfig
from typing import List, Dict
from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.mongo import get_db
from app.api.chat import get_ai_service
from pydantic import BaseModel
from app.utils.dependencies import get_current_active_customer

router = APIRouter()

@router.post("/comparison-configs/", response_model=ComparisonConfig, status_code=201)
async def create_config(
    config: ComparisonConfig, 
    db: AsyncIOMotorClient = Depends(get_db),
    current_user: Dict = Depends(get_current_active_customer)
):
    """Create a new comparison configuration."""
    # Add user_id to config data
    config_data = config.model_dump()
    config_data["user_id"] = current_user["id"]
    return await create_comparison_config(config_data)

@router.get("/comparison-configs/{category}", response_model=ComparisonConfig)
async def get_config(
    category: str, 
    db: AsyncIOMotorClient = Depends(get_db),
    current_user: Dict = Depends(get_current_active_customer)
):
    """Get a comparison configuration by category."""
    config = await get_comparison_config(category, user_id=current_user["id"])
    if not config:
        raise HTTPException(status_code=404, detail="Comparison config not found")
    return config

@router.put("/comparison-configs/{category}", response_model=ComparisonConfig)
async def update_config(
    category: str, 
    config: ComparisonConfig, 
    db: AsyncIOMotorClient = Depends(get_db),
    current_user: Dict = Depends(get_current_active_customer)
):
    """Update a comparison configuration."""
    # Add user_id to config data
    config_data = config.model_dump()
    config_data["user_id"] = current_user["id"]
    return await update_comparison_config(category, config_data, user_id=current_user["id"])

@router.delete("/comparison-configs/{category}", status_code=204)
async def delete_config(
    category: str, 
    db: AsyncIOMotorClient = Depends(get_db),
    current_user: Dict = Depends(get_current_active_customer)
):
    """Delete a comparison configuration."""
    await delete_comparison_config(category, user_id=current_user["id"])
    return {"message": "Comparison config deleted successfully"}

@router.get("/comparison-configs/", response_model=List[ComparisonConfig])
async def list_configs(
    db: AsyncIOMotorClient = Depends(get_db),
    current_user: Dict = Depends(get_current_active_customer)
):
    """List all comparison configurations."""
    return await get_all_comparison_configs(user_id=current_user["id"])

class CategorySuggestions(BaseModel):
    """Response model for AI-generated suggestions."""
    key_features: List[str]
    comparison_metrics: List[str]

@router.get("/comparison-configs/suggestions/{category}", response_model=CategorySuggestions)
async def get_suggestions(category: str, language: str = "en", db: AsyncIOMotorClient = Depends(get_db)):
    """Generate AI suggestions for key features and comparison metrics based on category.
    
    Args:
        category: The business category to generate suggestions for
        language: The language for suggestions (en or cs)
    """
    try:
        # Log the category request
        print(f"Generating suggestions for category: {category}, language: {language}")
        
        # Normalize language parameter
        language = language.lower()
        if language not in ["en", "cs"]:
            language = "en"  # Default to English if not supported
            
        # Check for Czech category names and map to English equivalent for AI
        category_mappings = {
            "nábytek": "furniture",
            "elektronika": "electronics",
            "oblečení": "clothing",
            "oděvy": "clothing",
            "potraviny": "food",
            "sportovní vybavení": "sports equipment",
            "knihy": "books",
            "hračky": "toys"
        }
        
        # Use English category for AI if we have a mapping
        ai_category = category_mappings.get(category.lower(), category)
        
        # Get AI service
        ai_service = await get_ai_service()
        
        # Create a prompt for the AI to generate suggestions
        if language == "cs":
            prompt = f"""
            Na základě obchodní kategorie "{category}" vygeneruj:
            1. Seznam klíčových vlastností, které jsou nejrelevantnější pro porovnávání produktů v této kategorii
            2. Seznam srovnávacích metrik, které by byly užitečné pro hodnocení produktů v této kategorii
            
            Formátuj svou odpověď jako JSON objekt se dvěma poli:
            {{
                "key_features": ["vlastnost1", "vlastnost2", ...],
                "comparison_metrics": ["metrika1", "metrika2", ...]
            }}
            
            Každý seznam by měl obsahovat 5-10 položek, které jsou specifické a relevantní pro obchodní typ {category}.
            Buď velmi konkrétní a detailní. Například pokud je kategorie "elektronika", neříkej jen "výdrž baterie", ale upřesni "výdrž baterie v hodinách" nebo podobně přesné metriky.
            
            Odpověz POUZE v češtině.
            """
        else:
            prompt = f"""
            Based on the business category "{ai_category}", generate:
            1. A list of key features that are most relevant for comparing products in this category
            2. A list of comparison metrics that would be useful for evaluating products in this category
            
            Format your response as a JSON object with two arrays:
            {{
                "key_features": ["feature1", "feature2", ...],
                "comparison_metrics": ["metric1", "metric2", ...]
            }}
            
            Each list should contain 5-10 items that are specific and relevant to the {ai_category} business type.
            Be very specific and detailed. For example, if the category is "electronics", don't just say "battery life" but specify "battery duration in hours" or similar precise metrics.
            """
        
        # Get AI response
        response = await ai_service.generate_response(
            query=prompt,
            language=language  # Use the requested language
        )
        
        # Extract the response content and parse it as JSON
        import json
        import re
        
        # Extract JSON from the response text
        content = response.get("response", "")
        print(f"AI response content: {content[:200]}...") # Print first 200 chars for debugging
        
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        
        if json_match:
            try:
                json_str = json_match.group(0)
                print(f"Extracted JSON: {json_str[:200]}...") # Print first 200 chars for debugging
                
                suggestions = json.loads(json_str)
                result = CategorySuggestions(
                    key_features=suggestions.get("key_features", [])[:10],
                    comparison_metrics=suggestions.get("comparison_metrics", [])[:10]
                )
                
                # Log the result
                print(f"Generated suggestions: features={len(result.key_features)}, metrics={len(result.comparison_metrics)}")
                
                return result
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {str(e)}, JSON string: {json_str[:100]}...")
                # Continue to fallback
        
        print("JSON extraction failed, using fallback text parsing")
        
        # Fallback method: Try to extract lists directly from text
        features = []
        metrics = []
        
        feature_section = False
        metric_section = False
        
        for line in content.split('\n'):
            line = line.strip()
            if language == "cs":
                if "klíčové vlastnosti" in line.lower() or "klicove vlastnosti" in line.lower() or "key_features" in line.lower():
                    feature_section = True
                    metric_section = False
                    continue
                elif "srovnávací metriky" in line.lower() or "srovnavaci metriky" in line.lower() or "comparison_metrics" in line.lower():
                    feature_section = False
                    metric_section = True
                    continue
            else:
                if "key features" in line.lower() or "key_features" in line.lower():
                    feature_section = True
                    metric_section = False
                    continue
                elif "comparison metrics" in line.lower() or "comparison_metrics" in line.lower():
                    feature_section = False
                    metric_section = True
                    continue
            
            # Extract items that look like list entries
            if (feature_section or metric_section) and (line.startswith('-') or line.startswith('*') or re.match(r'^\d+\.', line)):
                item = re.sub(r'^[-*\d\.]+\s*', '', line).strip()
                if item and feature_section:
                    features.append(item)
                elif item and metric_section:
                    metrics.append(item)
        
        # If fallback also doesn't work, use category-specific hardcoded suggestions
        if not features and not metrics:
            print("Fallback parsing failed, using hardcoded suggestions")
            
            # Hardcoded suggestions in both languages
            hardcoded = {
                "en": {
                    "furniture": {
                        "key_features": ["Material", "Design", "Dimensions", "Weight Capacity", "Assembly Required", 
                                        "Care Instructions", "Color Options", "Warranty", "Style", "Eco-Friendly"],
                        "comparison_metrics": ["Price", "Assembly Time", "Durability Rating", "Weight (kg)", "Customer Satisfaction", 
                                              "Material Quality", "Comfort Rating", "Design Score", "Warranty Length", "Maintenance Difficulty"]
                    },
                    "electronics": {
                        "key_features": ["Processing Power", "Storage Capacity", "Display Quality", "Battery Life", "Connectivity Options", 
                                        "Camera Resolution", "Build Quality", "Operating System", "Weight", "Water Resistance"],
                        "comparison_metrics": ["Price", "Performance Score", "Battery Duration (hours)", "Weight (g)", "Screen Size (inches)", 
                                              "Storage (GB)", "Camera Quality (MP)", "Warranty Period", "Energy Efficiency", "Customer Rating"]
                    },
                    "clothing": {
                        "key_features": ["Material", "Style", "Fit", "Durability", "Comfort", "Care Instructions", 
                                        "Season", "Brand", "Country of Origin", "Sustainability"],
                        "comparison_metrics": ["Price", "Size Range", "Color Options", "Material Quality", "Washing Cycles Before Fading", 
                                              "Customer Comfort Rating", "Return Policy", "Ethical Production Score", "Fabric Thickness", "Style Versatility"]
                    }
                },
                "cs": {
                    "nábytek": {
                        "key_features": ["Materiál", "Design", "Rozměry", "Nosnost", "Nutnost montáže", 
                                        "Péče o výrobek", "Barevné varianty", "Záruka", "Styl", "Ekologická výroba"],
                        "comparison_metrics": ["Cena", "Doba montáže", "Hodnocení odolnosti", "Hmotnost (kg)", "Spokojenost zákazníků", 
                                              "Kvalita materiálu", "Hodnocení pohodlí", "Hodnocení designu", "Délka záruky", "Náročnost údržby"]
                    },
                    "elektronika": {
                        "key_features": ["Výpočetní výkon", "Kapacita úložiště", "Kvalita displeje", "Výdrž baterie", "Možnosti připojení", 
                                        "Rozlišení fotoaparátu", "Kvalita zpracování", "Operační systém", "Hmotnost", "Odolnost vůči vodě"],
                        "comparison_metrics": ["Cena", "Skóre výkonu", "Výdrž baterie (hodin)", "Hmotnost (g)", "Velikost displeje (palce)", 
                                              "Úložiště (GB)", "Kvalita fotoaparátu (MP)", "Záruční doba", "Energetická účinnost", "Hodnocení zákazníků"]
                    },
                    "oblečení": {
                        "key_features": ["Materiál", "Styl", "Střih", "Trvanlivost", "Pohodlí", "Pokyny k péči", 
                                        "Sezóna", "Značka", "Země původu", "Udržitelnost"],
                        "comparison_metrics": ["Cena", "Rozsah velikostí", "Barevné možnosti", "Kvalita materiálu", "Počet praní před vyblednutím", 
                                              "Hodnocení pohodlí zákazníky", "Možnost vrácení", "Skóre etické výroby", "Tloušťka látky", "Univerzálnost stylu"]
                    }
                }
            }
            
            # Map Czech categories to their English equivalents for the hardcoded dictionary
            if language == "cs":
                # Check direct Czech category
                if category.lower() in hardcoded["cs"]:
                    features = hardcoded["cs"][category.lower()]["key_features"]
                    metrics = hardcoded["cs"][category.lower()]["comparison_metrics"]
                # Try with the mapped English category
                elif ai_category.lower() in hardcoded["en"]:
                    # Translate English hardcoded suggestions to Czech manually
                    if ai_category.lower() == "furniture":
                        features = hardcoded["cs"]["nábytek"]["key_features"]
                        metrics = hardcoded["cs"]["nábytek"]["comparison_metrics"]
                    elif ai_category.lower() == "electronics":
                        features = hardcoded["cs"]["elektronika"]["key_features"]
                        metrics = hardcoded["cs"]["elektronika"]["comparison_metrics"]
                    elif ai_category.lower() == "clothing":
                        features = hardcoded["cs"]["oblečení"]["key_features"]
                        metrics = hardcoded["cs"]["oblečení"]["comparison_metrics"]
                    else:
                        # Generic Czech fallback
                        features = ["Kvalita", "Cena", "Design", "Trvanlivost", "Funkčnost", "Značka", "Záruka", "Zákaznická podpora"]
                        metrics = ["Cena", "Hodnocení", "Skóre kvality", "Index trvanlivosti", "Hodnota za peníze", "Výkon", "Spokojenost zákazníků"]
                else:
                    # Generic Czech fallback
                    features = ["Kvalita", "Cena", "Design", "Trvanlivost", "Funkčnost", "Značka", "Záruka", "Zákaznická podpora"]
                    metrics = ["Cena", "Hodnocení", "Skóre kvality", "Index trvanlivosti", "Hodnota za peníze", "Výkon", "Spokojenost zákazníků"]
            else:
                # English fallbacks
                if ai_category.lower() in hardcoded["en"]:
                    features = hardcoded["en"][ai_category.lower()]["key_features"]
                    metrics = hardcoded["en"][ai_category.lower()]["comparison_metrics"]
                else:
                    # Generic English fallback
                    features = ["Quality", "Price", "Design", "Durability", "Functionality", "Brand", "Warranty", "Customer Support"]
                    metrics = ["Cost", "Rating", "Quality Score", "Durability Index", "Value for Money", "Performance", "Customer Satisfaction"]
        
        # Return the parsed or hardcoded results
        result = CategorySuggestions(
            key_features=features[:10],  # Limit to 10 items
            comparison_metrics=metrics[:10]  # Limit to 10 items
        )
        
        print(f"Final suggestions: features={len(result.key_features)}, metrics={len(result.comparison_metrics)}")
        return result
    
    except Exception as e:
        import traceback
        print(f"Error generating suggestions: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")