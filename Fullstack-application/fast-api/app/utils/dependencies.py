# app/utils/dependencies.py
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.collection import Collection
from app.utils.mongo import get_db
from fastapi import Depends, HTTPException, Security, status, Header
from fastapi.security import OAuth2PasswordBearer
from .jwt import verify_token
from app.utils.logging_config import get_module_logger
from typing import Optional
import logging
import secrets
import string

from app.services.constants import (
    PRODUCT_COLLECTION_NAME,
    QA_COLLECTION_NAME,
    COMPARISON_CONFIGS_COLLECTION_NAME,
    GUIDED_CHAT_FLOWS_COLLECTION_NAME,
    USER_COLLECTION_NAME,
    CONVERSATIONS_COLLECTION_NAME,
    BUSINESS_CONFIGS_COLLECTION_NAME
)

logger = get_module_logger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_product_collection(db: AsyncIOMotorClient = Depends(get_db)) -> Collection:
    """Returns the product collection."""
    return db.get_collection(PRODUCT_COLLECTION_NAME)

async def get_qa_collection(db: AsyncIOMotorClient = Depends(get_db)) -> Collection:
    """Returns the qa_items collection."""
    return db.get_collection(QA_COLLECTION_NAME)

async def get_comparison_configs_collection(db: AsyncIOMotorClient = Depends(get_db)) -> Collection:
    """Returns the comparison_configs collection."""
    return db.get_collection(COMPARISON_CONFIGS_COLLECTION_NAME)

async def get_guided_chat_flows_collection(db: AsyncIOMotorClient = Depends(get_db)) -> Collection:
    """Returns the guided chat flows collection."""
    return db.get_collection(GUIDED_CHAT_FLOWS_COLLECTION_NAME)

async def get_user_collection(db: AsyncIOMotorClient = Depends(get_db)):
    """Returns the user collection."""
    return db.get_collection(USER_COLLECTION_NAME)

async def get_conversations_collection(db: AsyncIOMotorClient = Depends(get_db)):
    """Returns the conversations collection."""
    return db.get_collection(CONVERSATIONS_COLLECTION_NAME)

async def get_business_configs_collection(db: AsyncIOMotorClient = Depends(get_db)):
    """Returns the business configurations collection."""
    return db.get_collection(BUSINESS_CONFIGS_COLLECTION_NAME)

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncIOMotorClient = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = verify_token(token)
        user_id: str = payload.get("user_id")
        if user_id is None:
            logger.error("User ID not found in token")
            raise credentials_exception

        user_collection = await get_user_collection()
        user = await user_collection.find_one({"id": user_id})
        if user is None:
            logger.error("User not found in database")
            raise credentials_exception

        logger.debug(f"Authenticated user: {user_id}")
        return user
    except Exception as e:
        logger.error(f"Error in get_current_user: {e}")
        raise credentials_exception

async def get_current_active_user(current_user = Depends(get_current_user)):
    if current_user.get("is_email_verified") is False:
        raise HTTPException(status_code=403, detail="Email not verified")
    return current_user

# New dependency for handling API key authentication for widget
async def get_current_active_customer(x_api_key: Optional[str] = Header(None)):
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is missing",
        )
    
    try:
        user_collection = await get_user_collection()
        user = await user_collection.find_one({"api_key": x_api_key})
        
        if not user:
            logger.error(f"Invalid API key provided: {x_api_key[:5]}...")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
            )
        
        # Check if user has active subscription
        if user.get("subscription_status") not in ["active", "trialing"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Subscription inactive or expired",
            )
            
        logger.debug(f"API key authenticated for user: {user.get('id')}")
        return user
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Error validating API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error validating API key",
        )

def generate_api_key(length: int = 32) -> str:
    """Generate a secure API key of the specified length."""
    alphabet = string.ascii_letters + string.digits
    api_key = ''.join(secrets.choice(alphabet) for _ in range(length))
    return api_key