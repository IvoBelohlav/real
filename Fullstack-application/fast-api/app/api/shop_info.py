# app/api/shop_info.py
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.mongo import get_db, get_shop_info_collection, get_shop_info, update_shop_info
from app.models.shop_info import ShopInfo, ShopInfoUpdate
# from app.utils.error import handle_error # Removed import
from app.utils.jwt import verify_token
from fastapi.security import OAuth2PasswordBearer
from app.utils.logging_config import get_module_logger
from app.utils.dependencies import get_current_active_customer
from app.models.user import User
from datetime import datetime, timezone
import json

router = APIRouter()
logger = get_module_logger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

@router.get("/shop-info", response_model=ShopInfo)
async def get_shop_information(
    language: str = "cs", 
    current_user: dict = Depends(get_current_active_customer),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """
    Retrieves shop information for the specified language.
    Creates default shop info if none exists.
    """
    try:
        user_id = current_user["id"]
        user_id = current_user["id"]
        # MARK: Simplified logic - get_shop_info handles default creation per user
        shop_info = await get_shop_info(language=language, user_id=user_id)

        if not shop_info:
             # This should ideally not happen if get_shop_info works correctly,
             # but indicates a potential issue in the util function or DB connection.
             logger.error(f"Failed to get or create shop info for user {user_id}, language {language}")
             raise HTTPException(
                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                 detail="Failed to retrieve or create shop information"
             )

        return shop_info
    except HTTPException:
        raise # Re-raise specific HTTP exceptions
    except Exception as e:
        logger.error(f"Unexpected error retrieving shop information for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while retrieving shop information."
        )

@router.put("/shop-info", response_model=ShopInfo)
async def update_shop_information(
    shop_info_update: ShopInfoUpdate,
    language: str = "cs",
    current_user: dict = Depends(get_current_active_customer),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """
    Updates shop information for the specified language.
    """
    try:
        user_id = current_user["id"]
        
        # Get current shop info to ensure it exists
        current_info = await get_shop_info(language, user_id)
        if not current_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Shop information for language '{language}' not found"
            )
        
        # Prepare update data
        update_data = shop_info_update.model_dump(exclude_unset=True)
        # Add updated timestamp and user_id
        update_data["updated_at"] = datetime.now(timezone.utc)
        update_data["user_id"] = user_id
        
        # Update shop info
        updated_info = await update_shop_info(update_data, language, user_id)
        if not updated_info:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update shop information"
            )
            
        logger.info(f"Shop information updated by user {user_id}")
        return updated_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating shop information: {str(e)}")
        # Let the global handler catch and log generic exceptions
        logger.error(f"Error updating shop information: {str(e)}") # Keep logging specific context
        raise HTTPException(status_code=500, detail="Failed to update shop information") # Raise standard exception

@router.get("/shop-info/languages", response_model=List[str])
async def get_available_languages(
    current_user: dict = Depends(get_current_active_customer),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """
    Returns a list of languages for which shop information is available.
    """
    try:
        user_id = current_user["id"]
        collection = await get_shop_info_collection()
        languages = await collection.distinct("language", {"user_id": user_id})
        return languages
    except Exception as e:
        logger.error(f"Error retrieving available languages: {str(e)}")
        # Let the global handler catch and log generic exceptions
        logger.error(f"Error retrieving available languages: {str(e)}") # Keep logging specific context
        raise HTTPException(status_code=500, detail="Failed to retrieve available languages") # Raise standard exception

@router.post("/shop-info/reset", response_model=ShopInfo)
async def reset_shop_information(
    language: str = "cs",
    current_user: dict = Depends(get_current_active_customer),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """
    Resets shop information to default values.
    """
    try:
        user_id = current_user["id"]
        
        # Delete existing shop info for the specified language and user
        collection = await get_shop_info_collection()
        await collection.delete_one({"language": language, "user_id": user_id})
        
        # Get default shop info (will be created since we just deleted it)
        new_default_info = await get_shop_info(language, user_id)
        
        logger.info(f"Shop information reset to default by user {user_id}")
        return new_default_info
        
    except Exception as e:
        logger.error(f"Error resetting shop information: {str(e)}")
        # Let the global handler catch and log generic exceptions
        logger.error(f"Error resetting shop information: {str(e)}") # Keep logging specific context
        raise HTTPException(status_code=500, detail="Failed to reset shop information") # Raise standard exception
