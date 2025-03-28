# app/api/shop_info.py
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.mongo import get_db, get_shop_info_collection, get_shop_info, update_shop_info
from app.models.shop_info import ShopInfo, ShopInfoUpdate
from app.utils.error import handle_error
from app.utils.jwt import verify_token
from fastapi.security import OAuth2PasswordBearer
from app.utils.logging_config import get_module_logger
from app.api.admin import get_current_user
from app.models.user import User
from datetime import datetime, timezone
import json

router = APIRouter()
logger = get_module_logger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

@router.get("/shop-info", response_model=ShopInfo)
async def get_shop_information(language: str = "cs", db: AsyncIOMotorClient = Depends(get_db)):
    """
    Retrieves shop information for the specified language.
    Creates default shop info if none exists.
    """
    try:
        shop_info = await get_shop_info(language)
        if not shop_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Shop information for language '{language}' not found"
            )
        return shop_info
    except Exception as e:
        logger.error(f"Error retrieving shop information: {str(e)}")
        handle_error(e, 500, "Failed to retrieve shop information")

@router.put("/shop-info", response_model=ShopInfo)
async def update_shop_information(
    shop_info_update: ShopInfoUpdate,
    language: str = "cs",
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """
    Updates shop information for the specified language.
    Permission check has been removed.
    """
    try:
        # Get current shop info to ensure it exists
        current_info = await get_shop_info(language)
        if not current_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Shop information for language '{language}' not found"
            )
        
        # Prepare update data
        update_data = shop_info_update.model_dump(exclude_unset=True)
        # Add updated timestamp
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        # Update shop info
        updated_info = await update_shop_info(update_data, language)
        if not updated_info:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update shop information"
            )
            
        logger.info(f"Shop information updated by user {current_user.id}")
        return updated_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating shop information: {str(e)}")
        handle_error(e, 500, "Failed to update shop information")

@router.get("/shop-info/languages", response_model=List[str])
async def get_available_languages(db: AsyncIOMotorClient = Depends(get_db)):
    """
    Returns a list of languages for which shop information is available.
    """
    try:
        collection = await get_shop_info_collection()
        languages = await collection.distinct("language")
        return languages
    except Exception as e:
        logger.error(f"Error retrieving available languages: {str(e)}")
        handle_error(e, 500, "Failed to retrieve available languages")

@router.post("/shop-info/reset", response_model=ShopInfo)
async def reset_shop_information(
    language: str = "cs",
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """
    Resets shop information to default values.
    Requires admin privileges.
    """
    # Verify admin permissions
    if current_user.subscription_tier != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    try:
        # Delete existing shop info for the specified language
        collection = await get_shop_info_collection()
        await collection.delete_one({"language": language})
        
        # Get default shop info (will be created since we just deleted it)
        new_default_info = await get_shop_info(language)
        
        logger.info(f"Shop information reset to default by user {current_user.id}")
        return new_default_info
        
    except Exception as e:
        logger.error(f"Error resetting shop information: {str(e)}")
        handle_error(e, 500, "Failed to reset shop information")