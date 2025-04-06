# app/api/api_keys.py
from fastapi import APIRouter, Depends, HTTPException, status
# Import necessary functions and dependencies
from app.utils.dependencies import get_current_user, generate_api_key, require_active_subscription
from app.utils.mongo import get_user_collection # Added for DB access
from app.utils.logging_config import get_module_logger
from pydantic import BaseModel

logger = get_module_logger(__name__)
router = APIRouter()

class ApiKeyResponse(BaseModel):
    api_key: str

@router.get("/api-keys/current")
# Apply subscription check dependency
async def get_current_api_key(current_user: dict = Depends(require_active_subscription)):
    """
    Get the current API key for the user (requires active subscription).
    """
    try:
        api_key = current_user.get("api_key")

        # If API key doesn't exist, generate, save, and return a new one
        if not api_key:
            logger.info(f"API key not found for user {current_user.get('id')}. Generating new key.")
            new_api_key = generate_api_key()

            # Save the new key to the database
            user_collection = await get_user_collection()
            await user_collection.update_one(
                {"id": current_user["id"]},
                {"$set": {"api_key": new_api_key}}
            )
            logger.info(f"Successfully generated and saved new API key for user {current_user.get('id')}.")
            return {"api_key": new_api_key} # Return the newly generated key

        # If key exists, return it
        return {"api_key": api_key}

    except Exception as e:
        logger.error(f"Error getting or generating API key for user {current_user.get('id')}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve API key"
        )

@router.post("/api-keys/regenerate", response_model=ApiKeyResponse)
# Apply subscription check dependency
async def regenerate_api_key(current_user: dict = Depends(require_active_subscription)):
    """
    Regenerate API key for the user (requires active subscription).
    """
    try:
        new_api_key = generate_api_key()
        
        # Update user with new API key
        from app.utils.mongo import get_user_collection
        user_collection = await get_user_collection()
        await user_collection.update_one(
            {"id": current_user["id"]},
            {"$set": {"api_key": new_api_key}}
        )
        
        return ApiKeyResponse(api_key=new_api_key)
    except Exception as e:
        logger.error(f"Error regenerating API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to regenerate API key"
        )
