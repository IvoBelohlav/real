from fastapi import APIRouter, HTTPException, Depends
from app.models.business import BusinessType
from app.utils.mongo import get_db, get_business_configs_collection
from typing import Dict, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.logging_config import get_module_logger
from app.api.chat import get_ai_service
from app.services.ai_service import AIService

logger = get_module_logger(__name__)

router = APIRouter()

# Cache for business configurations
business_configs_cache = {}

async def get_business_config_from_db(business_type: str, db: AsyncIOMotorClient) -> Optional[Dict]:
    """Get business configuration from database or cache"""
    if business_type in business_configs_cache:
        return business_configs_cache[business_type]
    
    collection = await get_business_configs_collection()
    config = await collection.find_one({"type": business_type})
    
    if config:
        business_configs_cache[business_type] = config
    
    return config

@router.get("/business/{business_type}", response_model=BusinessType)
async def get_business_config(business_type: str, db: AsyncIOMotorClient = Depends(get_db)):
    """Get configuration for a specific business type from the database."""
    config = await get_business_config_from_db(business_type, db)
    if not config:
        raise HTTPException(status_code=404, detail=f"Configuration for business type '{business_type}' not found.")
    return config

@router.post("/business/{business_type}/analyze")
async def analyze_business_query(
    business_type: str,
    query: str,
    db: AsyncIOMotorClient = Depends(get_db),
    ai_service: AIService = Depends(get_ai_service)
):
    """Analyze a query in the context of a specific business type."""
    # Get business config for extra context
    business_config = await get_business_config_from_db(business_type, db)
    if not business_config:
        logger.warning(f"Business config for '{business_type}' not found, proceeding without it")
    
    # Use AI service to analyze the query
    analysis_result = await ai_service.analyze_query(
        query=query,
        language="cs",  # Default to Czech, can be parameterized later
        context=None  # No conversation context for this endpoint
    )
    
    # Add business context to the result
    if business_config:
        analysis_result["business_context"] = {
            "type": business_type,
            "domain": business_config.get("domain", ""),
            "primary_category": business_config.get("primary_category", "")
        }
    
    return analysis_result

@router.post("/business/{business_type}/validate")
async def validate_product_data(
    business_type: str,
    product_data: Dict,
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Validate product data against business-specific rules."""
    # Get business config for validation rules
    business_config = await get_business_config_from_db(business_type, db)
    if not business_config:
        raise HTTPException(
            status_code=404, 
            detail=f"Business configuration for '{business_type}' not found"
        )
    
    # Get validation rules from business config
    validation_rules = business_config.get("validation_rules", {})
    
    # Perform basic validation
    validation_errors = []
    
    # Required fields check
    required_fields = validation_rules.get("required_fields", [])
    for field in required_fields:
        if field not in product_data or not product_data[field]:
            validation_errors.append(f"Missing required field: {field}")
    
    # Check data types
    field_types = validation_rules.get("field_types", {})
    for field, expected_type in field_types.items():
        if field in product_data and product_data[field] is not None:
            # Simple type checking
            if expected_type == "string" and not isinstance(product_data[field], str):
                validation_errors.append(f"Field {field} must be a string")
            elif expected_type == "number" and not isinstance(product_data[field], (int, float)):
                validation_errors.append(f"Field {field} must be a number")
            elif expected_type == "boolean" and not isinstance(product_data[field], bool):
                validation_errors.append(f"Field {field} must be a boolean")
            elif expected_type == "array" and not isinstance(product_data[field], list):
                validation_errors.append(f"Field {field} must be an array")
            elif expected_type == "object" and not isinstance(product_data[field], dict):
                validation_errors.append(f"Field {field} must be an object")
    
    # Check value ranges
    value_ranges = validation_rules.get("value_ranges", {})
    for field, range_info in value_ranges.items():
        if field in product_data and product_data[field] is not None:
            value = product_data[field]
            
            # Number range check
            if isinstance(value, (int, float)):
                min_val = range_info.get("min")
                max_val = range_info.get("max")
                
                if min_val is not None and value < min_val:
                    validation_errors.append(f"Field {field} must be at least {min_val}")
                if max_val is not None and value > max_val:
                    validation_errors.append(f"Field {field} must be at most {max_val}")
            
            # String length check
            if isinstance(value, str):
                min_length = range_info.get("min_length")
                max_length = range_info.get("max_length")
                
                if min_length is not None and len(value) < min_length:
                    validation_errors.append(f"Field {field} must be at least {min_length} characters")
                if max_length is not None and len(value) > max_length:
                    validation_errors.append(f"Field {field} must be at most {max_length} characters")
    
    # Process validation results
    if validation_errors:
        return {
            "valid": False,
            "errors": validation_errors
        }
    
    return {"valid": True, "message": "Product data is valid."}

@router.post("/reload-config")
async def reload_config(db: AsyncIOMotorClient = Depends(get_db)):
    """Reloads business configurations from the database."""
    try:
        # Clear the configuration cache
        business_configs_cache.clear()
        
        # Load all business configurations into cache
        collection = await get_business_configs_collection()
        cursor = collection.find({})
        
        configs_loaded = 0
        async for config in cursor:
            if "type" in config:
                business_configs_cache[config["type"]] = config
                configs_loaded += 1
        
        return {
            "message": "Business configurations reloaded successfully.",
            "configs_loaded": configs_loaded
        }
    except Exception as e:
        logger.error(f"Error reloading business configurations: {e}")
        raise HTTPException(status_code=500, detail=str(e))