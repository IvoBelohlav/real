from fastapi import APIRouter, HTTPException, Depends
from app.models.widget_config import WidgetConfig
from app.utils.mongo import get_db, get_widget_config_collection
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Dict
from fastapi import APIRouter, HTTPException, Depends, status # Added status
from pydantic import ValidationError # Added ValidationError
from app.models.widget_config import WidgetConfig
from app.utils.mongo import get_db, get_widget_config_collection
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Dict
from app.utils.logging_config import get_module_logger
# Import JWT, API Key, and the Origin verification dependencies
from app.utils.dependencies import require_active_subscription, verify_widget_origin, verify_widget_origin_for_config

logger = get_module_logger(__name__)

router = APIRouter()

@router.get("/widget-config", response_model=WidgetConfig)
async def get_widget_config(
    # Use JWT-based auth and subscription check dependency
    current_user: Dict = Depends(require_active_subscription) 
) -> WidgetConfig:
    """
    Retrieves the widget configuration for the authenticated user (requires active subscription).
    Returns the default configuration if no custom configuration is found.
    """
    logger.info(f"Entered get_widget_config for user: {current_user.get('id', 'N/A')}")
    try:
        user_id = current_user.get("id")
        # business_id = current_user.get("business_id") # Removed business_id extraction
        if not user_id: # Check only for user_id
            logger.error(f"User ID missing in token/user data for user: {user_id}")
            raise HTTPException(status_code=400, detail="User ID missing.")
        logger.debug(f"User ID extracted: {user_id}") # Removed business_id from log

        config_collection = await get_widget_config_collection()
        logger.debug("Widget config collection obtained.")

        # Use user_id in the query
        config = await config_collection.find_one({"user_id": user_id})
        logger.debug(f"Result from find_one using user_id '{user_id}': {config}")

        if config:
            logger.info(f"Retrieved custom widget configuration for user {user_id}") # Changed log message
            # Validate config against Pydantic model before returning
            validated_config = WidgetConfig(**config)
            logger.debug("Custom config validated successfully.")
            return validated_config
        else:
            logger.info(f"No custom widget configuration found for user {user_id}, returning default") # Changed log message
            # Use only user_id when creating default
            default_config = WidgetConfig(user_id=user_id) # Removed business_id
            logger.debug("Default config created.")
            # Optionally save the default config to the DB here if desired
            # await config_collection.insert_one(default_config.model_dump())
            return default_config
    except ValidationError as ve:
        logger.error(f"Pydantic validation error retrieving widget config for user {user_id}: {ve}", exc_info=True) # Changed log message
        raise HTTPException(status_code=500, detail=f"Invalid widget configuration data found: {ve}")
    except Exception as e:
        logger.error(f"Error retrieving widget configuration for user {user_id}: {e}", exc_info=True) # Changed log message
        raise HTTPException(status_code=500, detail=f"Failed to retrieve widget configuration: {str(e)}")

@router.put("/widget-config", response_model=WidgetConfig)
async def update_widget_config(
    new_config: WidgetConfig, 
    # Use JWT-based auth and subscription check dependency
    current_user: Dict = Depends(require_active_subscription) 
) -> WidgetConfig:
    """
    Updates the widget configuration for the authenticated user (requires active subscription).
    """
    logger.info(f"Entered update_widget_config for user: {current_user.get('id', 'N/A')}")
    try:
        user_id = current_user.get("id")
        # business_id = current_user.get("business_id") # Removed business_id extraction
        if not user_id: # Check only for user_id
            logger.error(f"User ID missing in token/user data for user: {user_id}")
            raise HTTPException(status_code=400, detail="User ID missing.")
        logger.debug(f"User ID extracted: {user_id}") # Removed business_id from log

        config_collection = await get_widget_config_collection()
        logger.debug("Widget config collection obtained.")

        # Ensure user_id from the authenticated context is set on the incoming data
        new_config.user_id = user_id
        # new_config.business_id = business_id # Removed setting business_id

        # Use exclude_none=True to avoid overwriting fields with None if not provided
        # Exclude user_id as it's used in the filter
        new_config_dict = new_config.model_dump(exclude_unset=True, exclude_none=True, exclude={"user_id"})
        logger.debug(f"Data for update/upsert: {new_config_dict}")

        # Use user_id in the query filter
        update_result = await config_collection.update_one(
            {"user_id": user_id}, # Filter by user_id
            {"$set": new_config_dict},
            upsert=True
        )
        # Log the captured result
        logger.debug(f"Update result: acknowledged={update_result.acknowledged}, matched={update_result.matched_count}, modified={update_result.modified_count}, upserted_id={update_result.upserted_id}")

        logger.info(f"Widget configuration updated/upserted for user {user_id}") # Changed log message

        # Fetch the potentially updated or newly created document using user_id
        updated_config_doc = await config_collection.find_one({"user_id": user_id}) # Fetch by user_id
        if not updated_config_doc:
             logger.error(f"Failed to find widget config for user {user_id} immediately after update/upsert.") # Changed log message
             raise HTTPException(status_code=500, detail="Failed to retrieve configuration after update.")

        logger.debug(f"Fetched updated config doc for user {user_id}: {updated_config_doc}") # Changed log message
        # Validate before returning
        validated_updated_config = WidgetConfig(**updated_config_doc)
        logger.debug("Updated config validated successfully.")
        return validated_updated_config

    except ValidationError as ve: # Catches validation errors from the input `new_config`
        logger.error(f"Pydantic validation error updating widget config for user {user_id}: {ve}", exc_info=True) # Changed log message
        # Extract specific error details if possible
        error_details = ve.errors()
        raise HTTPException(status_code=422, detail=error_details)
    except Exception as e:
        # Handle potential DuplicateKeyError specifically
        if "E11000" in str(e):
             logger.error(f"Duplicate key error updating widget config for user {user_id}: {e}", exc_info=True) # Changed log message
             # This might indicate a logic error elsewhere if upsert should handle it, or a race condition.
             raise HTTPException(status_code=409, detail="Configuration conflict. Please try again.")
        logger.error(f"Error updating widget configuration for user {user_id}: {e}", exc_info=True) # Changed log message
        raise HTTPException(status_code=500, detail=f"Failed to update widget configuration: {str(e)}")


# --- New Endpoint for Public Widget Script ---
@router.get("/public/widget-config", response_model=WidgetConfig, name="public:get-widget-config", tags=["Public Widget"])
async def get_public_widget_config(
    # Use the dependency that checks Origin ONLY to find the user for config
    current_user: Dict = Depends(verify_widget_origin_for_config)
) -> WidgetConfig:
    """
    Retrieves the widget configuration based *only* on the request's Origin header
    matching a domain in a user's whitelist.
    This endpoint is intended ONLY for the initial config fetch by the public widget script.
    Subsequent API calls from the widget MUST use X-Api-Key and verify_widget_origin.
    Retrieves the widget configuration using an API key.
    This endpoint is intended to be called by the public widget script.
    """
    logger.info(f"Entered get_public_widget_config for user via API key: {current_user.get('id', 'N/A')}")
    try:
        user_id = current_user.get("id") # User dict comes from get_user_from_api_key
        # business_id = current_user.get("business_id") # Removed business_id extraction
        if not user_id: # Check only for user_id
            logger.error(f"User ID missing in user data for API key user: {user_id}")
            raise HTTPException(status_code=400, detail="User ID missing.")
        logger.debug(f"User ID extracted from API key auth: {user_id}") # Removed business_id from log

        config_collection = await get_widget_config_collection()
        logger.debug("Widget config collection obtained.")

        # Use user_id in the query
        config = await config_collection.find_one({"user_id": user_id}) # Query by user_id
        logger.debug(f"Result from find_one using user_id '{user_id}': {config}") # Changed log message

        if config:
            logger.info(f"Retrieved custom widget configuration for user {user_id} via API key") # Changed log message
            # Validate config against Pydantic model before returning
            validated_config = WidgetConfig(**config)
            logger.debug("Custom config validated successfully.")
            return validated_config
        else:
            # If no config exists, create and return a default one.
            # This ensures the widget always gets *some* config.
            logger.info(f"No custom widget configuration found for user {user_id} via API key, returning default") # Changed log message
            # Use only user_id when creating default
            default_config = WidgetConfig(user_id=user_id) # Removed business_id
            logger.debug("Default config created.")
            # Optionally save the default config to the DB? Depends on desired behavior.
            # await config_collection.insert_one(default_config.model_dump())
            return default_config
    except ValidationError as ve:
        logger.error(f"Pydantic validation error retrieving public widget config for user {user_id}: {ve}", exc_info=True) # Changed log message
        raise HTTPException(status_code=500, detail=f"Invalid widget configuration data found: {ve}")
    except Exception as e:
        logger.error(f"Error retrieving public widget configuration for user {user_id}: {e}", exc_info=True) # Changed log message
        # Avoid leaking internal details in public endpoint error
        raise HTTPException(status_code=500, detail="Failed to retrieve widget configuration.")

# --- Removed duplicate endpoint definition ---
# (The orphaned code block below this comment has been removed)
