# app/utils/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from .jwt import verify_token
from .mongo import get_db, get_user_collection
from app.utils.logging_config import get_module_logger
from motor.motor_asyncio import AsyncIOMotorClient

logger = get_module_logger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

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