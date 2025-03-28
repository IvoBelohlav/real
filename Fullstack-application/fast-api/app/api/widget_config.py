from fastapi import APIRouter, HTTPException, Depends
from app.models.widget_config import WidgetConfig
from app.utils.mongo import get_db, get_widget_config_collection
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Dict
from app.utils.logging_config import get_module_logger
from app.utils.dependencies import get_current_active_customer

logger = get_module_logger(__name__)

router = APIRouter()

@router.get("/widget-config", response_model=WidgetConfig)
async def get_widget_config(
    current_user: Dict = Depends(get_current_active_customer)
) -> WidgetConfig:
    """
    Retrieves the widget configuration for the authenticated user.
    Returns the default configuration if no custom configuration is found.
    """
    user_id = current_user["id"]
    
    config_collection = await get_widget_config_collection()
    try:
        config = await config_collection.find_one({"user_id": user_id})
        
        if config:
            logger.info(f"Retrieved custom widget configuration for user {user_id}")
            return WidgetConfig(**config)
        else:
            logger.info(f"No custom widget configuration found for user {user_id}, returning default")
            default_config = WidgetConfig()
            default_config.user_id = user_id
            return default_config
    except Exception as e:
        logger.error(f"Error retrieving widget configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve widget configuration")

@router.put("/widget-config", response_model=WidgetConfig)
async def update_widget_config(
    new_config: WidgetConfig, 
    current_user: Dict = Depends(get_current_active_customer)
) -> WidgetConfig:
    """
    Updates the widget configuration for the authenticated user.
    """
    user_id = current_user["id"]
    
    config_collection = await get_widget_config_collection()
    try:
        new_config.user_id = user_id
        new_config_dict = new_config.model_dump(exclude_unset=True)

        await config_collection.update_one(
            {"user_id": user_id},
            {"$set": new_config_dict},
            upsert=True
        )
        
        logger.info(f"Widget configuration updated for user {user_id}")
        updated_config = await config_collection.find_one({"user_id": user_id})
        return WidgetConfig(**updated_config)
    except Exception as e:
        logger.error(f"Error updating widget configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to update widget configuration")