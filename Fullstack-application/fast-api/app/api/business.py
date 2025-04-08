from fastapi import APIRouter, HTTPException, Depends, status, Query
from app.models.business import BusinessType # Assuming these exist or adjust as needed
from app.utils.mongo import get_db, get_business_configs_collection, serialize_mongo_doc
from typing import Dict, Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field # Import BaseModel and Field
from app.utils.logging_config import get_module_logger
from app.api.chat import get_ai_service
from app.services.ai_service import AIService
# Switch to get_current_user for dashboard operations
from app.utils.dependencies import get_current_user
from bson import ObjectId
from pydantic import ValidationError

import uuid
import re # Import re for JSON extraction
import json # Import json

logger = get_module_logger(__name__)

# Use a more specific tag for OpenAPI docs
router = APIRouter(prefix="/business-types", tags=["Business Types"])

# --- Pydantic Models for Suggestions ---
class BusinessSuggestionsResponse(BaseModel):
    """Response model for AI-generated business type suggestions."""
    key_features: List[str] = Field(default_factory=list, description="Suggested key features for comparison.")
    comparison_metrics: List[str] = Field(default_factory=list, description="Suggested comparison metrics.")

# --- AI Suggestions Endpoint ---
@router.get("/suggestions", response_model=BusinessSuggestionsResponse)
async def get_business_type_suggestions(
    type_name: str = Query(..., description="Name/Type of the business (e.g., 'Electronics Shop')"),
    # Removed description, domain, primary_category as they are no longer part of the simplified model
    language: str = Query("cs", description="Language for suggestions (cs or en)"), # Keep language for prompt generation
    current_user: Dict = Depends(get_current_user),
    ai_service: AIService = Depends(get_ai_service)
):
    """Generate AI suggestions for key features and comparison metrics based on the business type name."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user")

    logger.info(f"Generating comparison suggestions for business type: {type_name}, lang: {language}, user: {user_id}")

    language = language.lower()
    if language not in ["cs", "en"]:
        language = "cs" # Default to Czech

    # Build the prompt for key features and comparison metrics
    if language == "cs":
        prompt = f"""
        Pro typ podnikání '{type_name}' navrhni 3-7 relevantních klíčových vlastností (key_features) a 3-7 metrik pro porovnání (comparison_metrics), které by byly užitečné pro porovnávání produktů v tomto odvětví.

        Příklady pro 'Obchod s elektronikou':
        - Klíčové vlastnosti: Velikost obrazovky, RAM, Úložiště, Procesor
        - Metriky pro porovnání: Cena, Hodnocení zákazníků, Výdrž baterie (hodiny)

        Formátuj svou odpověď jako JSON objekt se dvěma poli: "key_features" a "comparison_metrics", kde každé pole obsahuje seznam stringů:
        {{
            "key_features": ["Navrhovaná vlastnost 1", "Navrhovaná vlastnost 2", ...],
            "comparison_metrics": ["Navrhovaná metrika 1", "Navrhovaná metrika 2", ...]
        }}
        """
    else: # English fallback/option
        prompt = f"""
        For the business type '{type_name}', suggest 3-7 relevant key features (key_features) and 3-7 comparison metrics (comparison_metrics) that would be useful for comparing products in this sector.

        Examples for 'Electronics Shop':
        - Key Features: Screen Size, RAM, Storage, Processor
        - Comparison Metrics: Price, Customer Rating, Battery Life (hours)

        Format your response as a JSON object with two fields: "key_features" and "comparison_metrics", where each field contains a list of strings:
        {{
            "key_features": ["Suggested Feature 1", "Suggested Feature 2", ...],
            "comparison_metrics": ["Suggested Metric 1", "Suggested Metric 2", ...]
        }}
        """

    try:
        ai_response_data = await ai_service.generate_response(query=prompt, language=language)
        content = ai_response_data.get("reply", "") # Get content from 'reply'
        logger.debug(f"Raw AI reply for comparison suggestions: {content[:200]}...")

        # Extract JSON specifically from ```json ... ``` block
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', content, re.DOTALL | re.IGNORECASE)
        if json_match:
            json_str = json_match.group(1) # Get the captured JSON part
            logger.debug(f"Extracted JSON string for comparison suggestions: {json_str[:100]}...")
            try:
                suggestions_data = json.loads(json_str)

                # Validate and limit (ensure fields are lists)
                key_features = suggestions_data.get("key_features", [])
                if not isinstance(key_features, list):
                    logger.warning(f"AI returned 'key_features' but it's not a list: {type(key_features)}")
                    key_features = []

                comparison_metrics = suggestions_data.get("comparison_metrics", [])
                if not isinstance(comparison_metrics, list):
                    logger.warning(f"AI returned 'comparison_metrics' but it's not a list: {type(comparison_metrics)}")
                    comparison_metrics = []

                validated_suggestions = BusinessSuggestionsResponse(
                    key_features=key_features[:10], # Limit to 10
                    comparison_metrics=comparison_metrics[:10] # Limit to 10
                )
                logger.info(f"Generated {len(validated_suggestions.key_features)} key features and {len(validated_suggestions.comparison_metrics)} metrics for {type_name}")
                return validated_suggestions
            except (json.JSONDecodeError, ValidationError) as e:
                logger.error(f"Error parsing/validating extracted AI JSON for comparison suggestions: {e}, JSON string: {json_str[:100]}...")
                # Fall through to empty response
        else:
             logger.warning(f"Could not extract JSON block (```json ... ```) from AI reply for comparison suggestions: {content[:100]}...")

        # Return empty suggestions if AI fails, response is invalid, or JSON extraction fails
        return BusinessSuggestionsResponse()

    except Exception as e:
        logger.error(f"Error generating comparison suggestions for {type_name}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate suggestions")

# --- CRUD Endpoints for Business Types (Simplified) ---

# Cache for business configurations - Consider if this cache needs invalidation on CUD operations
business_configs_cache: Dict[str, BusinessType] = {} # Cache stores the Pydantic model instance

async def get_business_config_from_db(business_type_id: str, db: AsyncIOMotorClient, user_id: str) -> Optional[BusinessType]:
    """Get business configuration from database or cache by ID."""
    if not ObjectId.is_valid(business_type_id):
        logger.warning(f"Invalid ObjectId format for business_type_id: {business_type_id}")
        return None

    cache_key = f"{business_type_id}_{user_id}"

    if cache_key in business_configs_cache:
        logger.debug(f"Cache hit for business type ID '{business_type_id}' user '{user_id}'")
        return business_configs_cache[cache_key]

    logger.debug(f"Cache miss for business type ID '{business_type_id}' user '{user_id}'")
    collection = await get_business_configs_collection()
    filter_query = {"_id": ObjectId(business_type_id), "user_id": user_id}
    config_doc = await collection.find_one(filter_query)

    if config_doc:
        try:
            # Validate and store the Pydantic model in cache
            config_model = BusinessType(**serialize_mongo_doc(config_doc))
            business_configs_cache[cache_key] = config_model
            return config_model
        except ValidationError as e:
            logger.error(f"Data validation error for business type {business_type_id} from DB: {e}")
            return None # Data in DB is invalid
    else:
        logger.warning(f"Business type ID '{business_type_id}' not found for user '{user_id}' in DB.")
        return None


@router.post("/", response_model=BusinessType, status_code=status.HTTP_201_CREATED)
async def create_business_type(
    business_type_data: BusinessType, # Input model is now simplified
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Creates a new simplified business type configuration."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user")

    collection = await get_business_configs_collection()

    # Check for duplicate type name for the same user
    existing = await collection.find_one({"type": business_type_data.type, "user_id": user_id})
    if existing:
        logger.warning(f"Attempt to create duplicate business type name '{business_type_data.type}' for user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A business type named '{business_type_data.type}' already exists."
        )

    # Prepare data using the simplified model, exclude None values like id
    insert_data = business_type_data.model_dump(exclude_none=True, by_alias=False) # Use field names, not aliases
    insert_data["user_id"] = user_id # Ensure user_id is set

    try:
        result = await collection.insert_one(insert_data)
        # Fetch the created document to return it, including the generated _id
        created_doc = await collection.find_one({"_id": result.inserted_id})

        if not created_doc:
             logger.error(f"Failed to fetch business type immediately after insertion (ID: {result.inserted_id}) for user {user_id}")
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create and retrieve business type")

        logger.info(f"Created business type '{business_type_data.type}' with id {result.inserted_id} for user {user_id}")
        # Return the validated Pydantic model, which handles alias automatically
        return BusinessType(**serialize_mongo_doc(created_doc))

    except Exception as e:
        logger.error(f"Error creating business type '{business_type_data.type}' for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create business type: {str(e)}")

# GET / (List all business types for user) - Remains largely the same, but returns the simplified model
@router.get("/", response_model=List[BusinessType])
async def list_business_types(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Lists all simplified business type configurations for the current user."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user")

    collection = await get_business_configs_collection()
    types_cursor = collection.find({"user_id": user_id})
    business_types_docs = await types_cursor.to_list(length=None)

    logger.info(f"Retrieved {len(business_types_docs)} business type documents for user {user_id}")

    # Validate and serialize each document using the Pydantic model
    result_list = []
    for doc in business_types_docs:
        try:
            # Use the model for validation and serialization (handles alias)
            result_list.append(BusinessType(**serialize_mongo_doc(doc)))
        except ValidationError as e:
            logger.error(f"Data validation error for business type doc {doc.get('_id')} for user {user_id}: {e}")
            # Optionally skip invalid docs or handle differently
            continue
    return result_list

# GET /{business_type_id} - Fetch by ID
@router.get("/{business_type_id}", response_model=BusinessType)
async def get_business_type_by_id(
    business_type_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Retrieves a specific simplified business type configuration by its MongoDB ID."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user")

    # Use the refactored function which includes caching and validation
    config_model = await get_business_config_from_db(business_type_id, db, user_id)

    if not config_model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business type not found or access denied")

    logger.info(f"Retrieved business type with ID {business_type_id} for user {user_id}")
    return config_model # Return the validated Pydantic model

# PUT /{business_type_id} - Update by ID
@router.put("/{business_type_id}", response_model=BusinessType)
async def update_business_type(
    business_type_id: str,
    business_type_data: BusinessType, # Input uses the simplified model
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Updates an existing simplified business type configuration."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user")

    if not ObjectId.is_valid(business_type_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid business_type_id format")

    collection = await get_business_configs_collection()

    # Check if the target document exists and belongs to the user
    existing_doc = await collection.find_one({"_id": ObjectId(business_type_id), "user_id": user_id})
    if not existing_doc:
        logger.warning(f"Update failed: Business type {business_type_id} not found for user {user_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business type not found or access denied")

    # Prepare update data using the simplified model
    # Exclude 'id' and 'user_id' as they shouldn't be updated directly
    update_data = business_type_data.model_dump(exclude={"id", "user_id"}, exclude_unset=True, by_alias=False)

    # Check for type name conflict if the name is being changed
    new_type_name = update_data.get('type')
    if new_type_name and new_type_name != existing_doc.get('type'):
        conflict_check = await collection.find_one({
            "type": new_type_name,
            "user_id": user_id,
            "_id": {"$ne": ObjectId(business_type_id)} # Exclude the current document
        })
        if conflict_check:
            logger.warning(f"Update conflict: Business type name '{new_type_name}' already exists for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A business type named '{new_type_name}' already exists."
            )

    if not update_data:
        logger.info(f"No fields to update for business type {business_type_id}")
        # Return the existing data, validated through the model
        return BusinessType(**serialize_mongo_doc(existing_doc))

    try:
        update_result = await collection.update_one(
            {"_id": ObjectId(business_type_id), "user_id": user_id},
            {"$set": update_data}
        )

        if update_result.matched_count == 0:
             logger.error(f"Update failed unexpectedly for business type {business_type_id} user {user_id} despite pre-check")
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business type not found during update operation")

        # Fetch the updated document to return
        updated_doc = await collection.find_one({"_id": ObjectId(business_type_id), "user_id": user_id})
        if not updated_doc:
             logger.error(f"Update seemed successful but could not refetch business type {business_type_id} for user {user_id}")
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Failed to retrieve updated business type")

        # Invalidate cache
        cache_key = f"{business_type_id}_{user_id}"
        if cache_key in business_configs_cache:
            del business_configs_cache[cache_key]
            logger.debug(f"Invalidated cache for business type ID {business_type_id} user {user_id}")

        logger.info(f"Updated business type {business_type_id} for user {user_id}")
        # Return the updated data, validated through the model
        return BusinessType(**serialize_mongo_doc(updated_doc))

    except Exception as e:
        logger.error(f"Error updating business type {business_type_id} for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error updating business type: {str(e)}")

# DELETE /{business_type_id} - Delete by ID
@router.delete("/{business_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_business_type(
    business_type_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """Deletes a simplified business type configuration."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user")

    if not ObjectId.is_valid(business_type_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid business_type_id format")

    collection = await get_business_configs_collection()

    # Attempt to delete the document belonging to the user
    result = await collection.delete_one({"_id": ObjectId(business_type_id), "user_id": user_id})

    if result.deleted_count == 0:
        logger.warning(f"Delete failed: Business type {business_type_id} not found for user {user_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business type not found or access denied")

    # Invalidate cache
    cache_key = f"{business_type_id}_{user_id}"
    if cache_key in business_configs_cache:
        del business_configs_cache[cache_key]
        logger.debug(f"Removed business type ID '{business_type_id}' user '{user_id}' from cache")

    logger.info(f"Deleted business type {business_type_id} for user {user_id}")
    # Return No Content status code (204) which doesn't require a body

# --- Removed Endpoints ---
# Removed /analyze-query/{business_type_name} as it relied on removed fields
# Removed /validate-product/{business_type_name} as it relied on removed fields
# Removed /by-name/{business_type_name} as ID-based fetching is preferred

# --- Cache Reload Endpoint (Adjusted) ---
@router.post("/reload-config", tags=["Business Types (Admin)"]) # Consider admin-only access
async def reload_config(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db) # Keep DB dependency if needed for potential pre-loading
):
    """Clears the business configuration cache for the current user."""
    user_id = current_user.get("id")
    if not user_id:
        # This check might be redundant if get_current_user handles it, but good for clarity
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user")

    logger.info(f"Clearing business config cache for user {user_id}")
    cleared_count = 0
    try:
        # Clear only the cache entries belonging to the current user
        keys_to_delete = [key for key in business_configs_cache if key.endswith(f"_{user_id}")]
        for key in keys_to_delete:
            del business_configs_cache[key]
            cleared_count += 1
        logger.info(f"Cleared {cleared_count} cache entries for user {user_id}")

        # Pre-loading is generally not recommended unless specifically needed,
        # as it can add load and complexity. Let the cache fill on demand.

        return {
            "message": f"Business configuration cache cleared for user {user_id}. Cleared {cleared_count} entries."
        }
    except Exception as e:
        logger.error(f"Error clearing business configurations cache for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error clearing configurations cache: {str(e)}")
