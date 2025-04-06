from fastapi import APIRouter, HTTPException, Depends, status
from app.models.business import BusinessType
from app.utils.mongo import get_db, get_business_configs_collection, serialize_mongo_doc
from typing import Dict, Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.logging_config import get_module_logger
from app.api.chat import get_ai_service
from app.services.ai_service import AIService
# Switch to get_current_user for dashboard operations
from app.utils.dependencies import get_current_user
from bson import ObjectId
from pydantic import ValidationError
import uuid # For potential future use if switching from ObjectId

logger = get_module_logger(__name__)

# Use a more specific tag for OpenAPI docs
router = APIRouter(prefix="/business-types", tags=["Business Types"])

# Cache for business configurations - Consider if this cache needs invalidation on CUD operations
business_configs_cache = {}

async def get_business_config_from_db(business_type: str, db: AsyncIOMotorClient, user_id: str = None) -> Optional[Dict]:
    """Get business configuration from database or cache by type name"""
    # Ensure user_id is always provided for cache key consistency in multi-tenant env
    if not user_id:
        logger.warning("Attempted to get business config without user_id")
        return None # Or raise error

    cache_key = f"{business_type}_{user_id}"

    if cache_key in business_configs_cache:
        logger.debug(f"Cache hit for business type '{business_type}' user '{user_id}'")
        return business_configs_cache[cache_key]

    logger.debug(f"Cache miss for business type '{business_type}' user '{user_id}'")
    collection = await get_business_configs_collection()

    # Build filter including user_id
    filter_query = {"type": business_type, "user_id": user_id}

    config = await collection.find_one(filter_query)

    if config:
        # Serialize _id before caching and returning
        serialized_config = serialize_mongo_doc(config)
        business_configs_cache[cache_key] = serialized_config
        return serialized_config
    else:
        logger.warning(f"Business type '{business_type}' not found for user '{user_id}' in DB.")
        return None


# --- CRUD Endpoints for Business Types ---

@router.post("/", response_model=BusinessType, status_code=status.HTTP_201_CREATED)
async def create_business_type(
    business_type_data: BusinessType,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db) # Keep db dependency if needed by collection func
):
    """Creates a new business type configuration."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user")

    collection = await get_business_configs_collection()

    # Check if a business type with the same 'type' already exists for this user
    existing = await collection.find_one({"type": business_type_data.type, "user_id": user_id})
    if existing:
        logger.warning(f"Attempt to create duplicate business type '{business_type_data.type}' for user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Business type '{business_type_data.type}' already exists for this user."
        )

    # Prepare data for insertion
    insert_data = business_type_data.model_dump()
    insert_data["user_id"] = user_id # Ensure user_id is set

    try:
        result = await collection.insert_one(insert_data)
        created_doc = await collection.find_one({"_id": result.inserted_id})

        if not created_doc:
             logger.error(f"Failed to fetch business type immediately after insertion for user {user_id}")
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create business type")

        # Invalidate cache if necessary (though this specific type wasn't cached yet)
        # cache_key = f"{business_type_data.type}_{user_id}"
        # if cache_key in business_configs_cache: del business_configs_cache[cache_key]

        logger.info(f"Created business type '{business_type_data.type}' with id {result.inserted_id} for user {user_id}")
        return serialize_mongo_doc(created_doc)

    except ValidationError as ve:
        logger.error(f"Validation error creating business type: {ve}")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Validation error: {str(ve)}")
    except Exception as e:
        logger.error(f"Failed to create business type: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create business type: {str(e)}")


@router.get("/", response_model=List[BusinessType])
async def list_business_types(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Lists all business type configurations for the current user."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user")

    collection = await get_business_configs_collection()
    types_cursor = collection.find({"user_id": user_id})
    business_types = await types_cursor.to_list(length=None) # Get all types for the user

    logger.info(f"Retrieved {len(business_types)} business types for user {user_id}")
    # Serialize each document
    return [serialize_mongo_doc(bt) for bt in business_types]


# Keep the original endpoint for fetching by type name if needed by other parts of the app
# But use the new endpoint with ID for dashboard CRUD operations
@router.get("/by-name/{business_type_name}", response_model=BusinessType, tags=["Business Types (Legacy)"])
async def get_business_config_by_name(
    business_type_name: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Get configuration for a specific business type by its name."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user")

    config = await get_business_config_from_db(business_type_name, db, user_id)
    if not config:
        raise HTTPException(status_code=404, detail=f"Configuration for business type '{business_type_name}' not found.")
    # get_business_config_from_db already returns serialized doc
    return config


@router.get("/{business_type_id}", response_model=BusinessType)
async def get_business_type_by_id(
    business_type_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Retrieves a specific business type configuration by its MongoDB ID."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user")

    if not ObjectId.is_valid(business_type_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid business_type_id format")

    collection = await get_business_configs_collection()
    business_type = await collection.find_one({"_id": ObjectId(business_type_id), "user_id": user_id})

    if not business_type:
        logger.warning(f"Business type with ID {business_type_id} not found for user {user_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business type not found or access denied")

    logger.info(f"Retrieved business type with ID {business_type_id} for user {user_id}")
    return serialize_mongo_doc(business_type)


@router.put("/{business_type_id}", response_model=BusinessType)
async def update_business_type(
    business_type_id: str,
    business_type_data: BusinessType,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Updates an existing business type configuration."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user")

    if not ObjectId.is_valid(business_type_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid business_type_id format")

    collection = await get_business_configs_collection()

    # Check if the business type exists and belongs to the user
    existing_doc = await collection.find_one({"_id": ObjectId(business_type_id), "user_id": user_id})
    if not existing_doc:
        logger.warning(f"Update failed: Business type {business_type_id} not found for user {user_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business type not found or access denied")

    # Prepare update data, excluding user_id and potentially _id
    update_data = business_type_data.model_dump(exclude_unset=True) # Only include provided fields
    if "user_id" in update_data:
        del update_data["user_id"] # Prevent changing ownership

    # Check if the 'type' name is being changed and if it conflicts with another existing type for the user
    if 'type' in update_data and update_data['type'] != existing_doc.get('type'):
        conflict_check = await collection.find_one({
            "type": update_data['type'],
            "user_id": user_id,
            "_id": {"$ne": ObjectId(business_type_id)} # Exclude the current document
        })
        if conflict_check:
            logger.warning(f"Update conflict: Business type name '{update_data['type']}' already exists for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Business type name '{update_data['type']}' already exists."
            )

    if not update_data:
        logger.info(f"No fields to update for business type {business_type_id}")
        return serialize_mongo_doc(existing_doc) # Return existing if no changes

    try:
        update_result = await collection.update_one(
            {"_id": ObjectId(business_type_id), "user_id": user_id},
            {"$set": update_data}
        )

        if update_result.matched_count == 0:
             # Should not happen due to the check above, but for safety
             logger.error(f"Update failed unexpectedly for business type {business_type_id} user {user_id}")
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business type not found during update")

        # Fetch the updated document
        updated_doc = await collection.find_one({"_id": ObjectId(business_type_id), "user_id": user_id})
        if not updated_doc:
             logger.error(f"Update seemed successful but could not refetch business type {business_type_id} for user {user_id}")
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Failed to retrieve updated business type")

        # Invalidate cache
        cache_key = f"{updated_doc['type']}_{user_id}"
        if cache_key in business_configs_cache: del business_configs_cache[cache_key]
        # Also remove old cache key if type name changed
        if 'type' in update_data and update_data['type'] != existing_doc.get('type'):
             old_cache_key = f"{existing_doc.get('type')}_{user_id}"
             if old_cache_key in business_configs_cache: del business_configs_cache[old_cache_key]


        logger.info(f"Updated business type {business_type_id} for user {user_id}")
        return serialize_mongo_doc(updated_doc)

    except ValidationError as ve:
        logger.error(f"Validation error updating business type {business_type_id}: {ve}")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Validation error: {str(ve)}")
    except Exception as e:
        logger.error(f"Error updating business type {business_type_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error updating business type: {str(e)}")


@router.delete("/{business_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_business_type(
    business_type_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Deletes a business type configuration."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user")

    if not ObjectId.is_valid(business_type_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid business_type_id format")

    collection = await get_business_configs_collection()

    # Find the document first to invalidate cache correctly
    doc_to_delete = await collection.find_one({"_id": ObjectId(business_type_id), "user_id": user_id})

    if not doc_to_delete:
        logger.warning(f"Delete failed: Business type {business_type_id} not found for user {user_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business type not found or access denied")

    try:
        result = await collection.delete_one({"_id": ObjectId(business_type_id), "user_id": user_id})

        if result.deleted_count == 0:
            # Should not happen due to the check above
            logger.error(f"Delete failed unexpectedly for business type {business_type_id} user {user_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business type not found during delete")

        # Invalidate cache
        cache_key = f"{doc_to_delete['type']}_{user_id}"
        if cache_key in business_configs_cache:
            del business_configs_cache[cache_key]
            logger.debug(f"Removed business type '{doc_to_delete['type']}' user '{user_id}' from cache")

        logger.info(f"Deleted business type {business_type_id} for user {user_id}")
        # Return No Content

    except Exception as e:
        logger.error(f"Error deleting business type {business_type_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error deleting business type: {str(e)}")


# --- Existing Endpoints (Adjusted for consistency) ---

@router.post("/analyze-query/{business_type_name}", tags=["Business Types (Legacy)"])
async def analyze_business_query(
    business_type_name: str,
    query: str,
    current_user: dict = Depends(get_current_user), # Switched to get_current_user
    db: AsyncIOMotorClient = Depends(get_db),
    ai_service: AIService = Depends(get_ai_service)
):
    """Analyze a query in the context of a specific business type (using type name)."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user")

    # Get business config for extra context using the name-based fetcher
    business_config = await get_business_config_from_db(business_type_name, db, user_id)
    if not business_config:
        logger.warning(f"Business config for '{business_type_name}' not found for user {user_id}, proceeding without it")

    # Use AI service to analyze the query
    try:
        analysis_result = await ai_service.analyze_query(
            query=query,
            language="cs",  # Default to Czech, can be parameterized later
            context=None  # No conversation context for this endpoint
        )

        # Add business context to the result
        if business_config:
            analysis_result["business_context"] = {
                "type": business_type_name, # Use the name provided
                "domain": business_config.get("domain", ""),
                "primary_category": business_config.get("primary_category", "")
                # Add other relevant attributes from business_config if needed
            }
        else:
             analysis_result["business_context"] = None

        return analysis_result
    except Exception as e:
        logger.error(f"Error analyzing query for business type {business_type_name}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error analyzing query")


@router.post("/validate-product/{business_type_name}", tags=["Business Types (Legacy)"])
async def validate_product_data(
    business_type_name: str,
    product_data: Dict,
    current_user: dict = Depends(get_current_user), # Switched to get_current_user
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Validate product data against business-specific rules (using type name)."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user")

    # Get business config for validation rules using the name-based fetcher
    business_config = await get_business_config_from_db(business_type_name, db, user_id)
    if not business_config:
        raise HTTPException(
            status_code=404,
            detail=f"Business configuration for '{business_type_name}' not found for user {user_id}"
        )

    # Get validation rules from business config
    validation_rules = business_config.get("validation_rules", {}) # Assuming structure from model

    # Perform basic validation (Example - enhance as needed)
    validation_errors = []

    # Required fields check from rules
    # Example: Check if 'product_name' rule exists and is required
    if 'product_name' in validation_rules and validation_rules['product_name'].get('required'):
        if 'product_name' not in product_data or not product_data['product_name']:
            validation_errors.append("Missing required field: product_name")

    # Example: Check type for 'price' if rule exists
    if 'price' in validation_rules and 'price' in product_data:
        price_rule = validation_rules['price']
        if price_rule.get('type') == 'number' and not isinstance(product_data['price'], (int, float)):
             validation_errors.append("Field 'price' must be a number")
        # Add range checks etc. based on rules

    # --- Add more specific validation logic based on validation_rules structure ---


    # Process validation results
    if validation_errors:
        logger.warning(f"Product data validation failed for business type '{business_type_name}' user {user_id}: {validation_errors}")
        # Return 422 for validation errors
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"valid": False, "errors": validation_errors}
        )

    logger.info(f"Product data validated successfully for business type '{business_type_name}' user {user_id}")
    return {"valid": True, "message": "Product data is valid."}


@router.post("/reload-config", tags=["Business Types (Admin)"]) # Potentially restrict access further
async def reload_config(
    current_user: dict = Depends(get_current_user), # Switched to get_current_user
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Reloads business configurations from the database into the cache for the current user."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user")

    logger.info(f"Reloading business config cache for user {user_id}")
    cleared_count = 0
    try:
        # Clear the configuration cache for the specific user
        keys_to_delete = [key for key in business_configs_cache if key.endswith(f"_{user_id}")]
        for key in keys_to_delete:
            del business_configs_cache[key]
            cleared_count += 1
        logger.debug(f"Cleared {cleared_count} cache entries for user {user_id}")

        # Optionally, pre-load configurations after clearing (might be heavy)
        # collection = await get_business_configs_collection()
        # cursor = collection.find({"user_id": user_id})
        # configs_loaded = 0
        # async for config in cursor:
        #     if "type" in config:
        #         cache_key = f"{config['type']}_{user_id}"
        #         business_configs_cache[cache_key] = serialize_mongo_doc(config)
        #         configs_loaded += 1
        # logger.info(f"Pre-loaded {configs_loaded} business configs into cache for user {user_id}")

        return {
            "message": f"Business configuration cache cleared for user {user_id}. Cleared {cleared_count} entries.",
            # "configs_loaded": configs_loaded # Uncomment if pre-loading
        }
    except Exception as e:
        logger.error(f"Error reloading business configurations for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error reloading configurations: {str(e)}")
