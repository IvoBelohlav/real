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
# Import JWT, API Key, and the new Origin verification dependencies
from app.utils.dependencies import require_active_subscription, get_user_from_api_key, verify_widget_origin

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
        user_id = current_user["id"]
        logger.debug(f"User ID extracted: {user_id}")
        
        config_collection = await get_widget_config_collection()
        logger.debug("Widget config collection obtained.")
        
        config = await config_collection.find_one({"user_id": user_id})
        logger.debug(f"Result from find_one: {config}")
        
        if config:
            logger.info(f"Retrieved custom widget configuration for user {user_id}")
            # Validate config against Pydantic model before returning
            validated_config = WidgetConfig(**config)
            logger.debug("Custom config validated successfully.")
            return validated_config
        else:
            logger.info(f"No custom widget configuration found for user {user_id}, returning default")
            default_config = WidgetConfig(user_id=user_id) # Pass user_id directly
            logger.debug("Default config created.")
            return default_config
    except ValidationError as ve:
        logger.error(f"Pydantic validation error retrieving widget config for user {user_id}: {ve}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Invalid widget configuration data found: {ve}")
    except Exception as e:
        logger.error(f"Error retrieving widget configuration for user {user_id}: {e}", exc_info=True)
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
        user_id = current_user["id"]
        logger.debug(f"User ID extracted: {user_id}")
        
        config_collection = await get_widget_config_collection()
        logger.debug("Widget config collection obtained.")
        
        new_config.user_id = user_id # Ensure user_id is set
        # Use exclude_none=True to avoid overwriting fields with None if not provided
        new_config_dict = new_config.model_dump(exclude_unset=True, exclude_none=True) 
        logger.debug(f"Data for update/upsert: {new_config_dict}")

        update_result = await config_collection.update_one( # Capture the result
            {"user_id": user_id},
            {"$set": new_config_dict},
            upsert=True
        )
        # Log the captured result
        logger.debug(f"Update result: acknowledged={update_result.acknowledged}, matched={update_result.matched_count}, modified={update_result.modified_count}, upserted_id={update_result.upserted_id}")
        
        logger.info(f"Widget configuration updated/upserted for user {user_id}")
        
        # Fetch the potentially updated or newly created document
        updated_config_doc = await config_collection.find_one({"user_id": user_id})
        if not updated_config_doc:
             logger.error(f"Failed to find widget config for user {user_id} immediately after update/upsert.")
             raise HTTPException(status_code=500, detail="Failed to retrieve configuration after update.")
             
        logger.debug(f"Fetched updated config doc: {updated_config_doc}")
        # Validate before returning
        validated_updated_config = WidgetConfig(**updated_config_doc)
        logger.debug("Updated config validated successfully.")
        return validated_updated_config
        
    except ValidationError as ve:
        logger.error(f"Pydantic validation error updating widget config for user {user_id}: {ve}", exc_info=True)
        raise HTTPException(status_code=422, detail=f"Invalid widget configuration data provided: {ve}")
    except Exception as e:
        logger.error(f"Error updating widget configuration for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update widget configuration: {str(e)}")


# --- New Endpoint for Public Widget Script ---
@router.get("/public/widget-config", response_model=WidgetConfig)
async def get_public_widget_config(
    # Use the new dependency that includes API key auth AND origin verification
    current_user: Dict = Depends(verify_widget_origin)
) -> WidgetConfig:
    """
    Retrieves the widget configuration using an API key.
    This endpoint is intended to be called by the public widget script.
    """
    logger.info(f"Entered get_public_widget_config for user via API key: {current_user.get('id', 'N/A')}")
    try:
        user_id = current_user["id"] # User dict comes from get_user_from_api_key
        logger.debug(f"User ID extracted from API key auth: {user_id}")

        config_collection = await get_widget_config_collection()
        logger.debug("Widget config collection obtained.")

        config = await config_collection.find_one({"user_id": user_id})
        logger.debug(f"Result from find_one: {config}")

        if config:
            logger.info(f"Retrieved custom widget configuration for user {user_id} via API key")
            # Validate config against Pydantic model before returning
            validated_config = WidgetConfig(**config)
            logger.debug("Custom config validated successfully.")
            return validated_config
        else:
            # If no config exists, create and return a default one.
            # This ensures the widget always gets *some* config.
            logger.info(f"No custom widget configuration found for user {user_id} via API key, returning default")
            default_config = WidgetConfig(user_id=user_id) # Pass user_id directly
            logger.debug("Default config created.")
            # Optionally save the default config to the DB? Depends on desired behavior.
            # await config_collection.insert_one(default_config.model_dump())
            return default_config
    except ValidationError as ve:
        logger.error(f"Pydantic validation error retrieving public widget config for user {user_id}: {ve}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Invalid widget configuration data found: {ve}")
    except Exception as e:
        logger.error(f"Error retrieving public widget configuration for user {user_id}: {e}", exc_info=True)
        # Avoid leaking internal details in public endpoint error
        raise HTTPException(status_code=500, detail="Failed to retrieve widget configuration.")

# --- Removed duplicate endpoint definition ---
# (The orphaned code block below this comment has been removed)
