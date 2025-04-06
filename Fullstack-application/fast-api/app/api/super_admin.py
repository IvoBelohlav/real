from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import List, Optional
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
# from beanie import PydanticObjectId # Beanie might not be used directly for updates here

from app.utils.mongo import get_db, get_user_collection
from app.models.user import User, UserProfile, SubscriptionStatus, SubscriptionTier # Keep User import for type hints if needed elsewhere, but dependency returns dict
from app.utils.jwt import verify_token
from app.utils.logging_config import get_module_logger
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(
    prefix="/superadmin",
    tags=["Super Admin"],
    # dependencies=[Depends(get_current_super_admin_user)] # Apply dependency later
)
logger = get_module_logger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login") # Match existing auth

async def get_current_super_admin_user(token: str = Depends(oauth2_scheme), db: AsyncIOMotorClient = Depends(get_db)) -> dict: # Return dict
    """
    Dependency to verify the user is a super admin based on the JWT token.
    Returns the raw user data dictionary upon successful verification.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    permission_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Insufficient permissions. Super admin access required.",
    )

    try:
        payload = verify_token(token)
        user_id: str = payload.get("user_id")
        if user_id is None:
            logger.error("User ID not found in token for super admin check")
            raise credentials_exception

        user_collection = await get_user_collection()
        # Fetch the user document directly to check the is_super_admin flag
        user_data = await user_collection.find_one({"id": user_id})
        if user_data is None:
            logger.error(f"Super admin check failed: User {user_id} not found")
            raise credentials_exception

        # Explicitly check the is_super_admin flag
        if not user_data.get("is_super_admin", False):
            logger.warning(f"User {user_id} attempted super admin access without permission.")
            raise permission_exception

        logger.info(f"Super admin access granted for user: {user_id}")
        # Return the raw dictionary fetched from DB
        return user_data # Return dict, not User model instance

    except HTTPException as e:
        raise e # Re-raise specific HTTP exceptions
    except Exception as e:
        logger.error(f"Error during super admin verification for user {user_id if 'user_id' in locals() else 'unknown'}: {e}", exc_info=True)
        raise credentials_exception

# Placeholder for future endpoints
@router.get("/users", response_model=List[UserProfile])
async def list_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user_data: dict = Depends(get_current_super_admin_user) # Expect dict
):
    """
    (Super Admin) Retrieves a list of all users.
    """
    current_user_id = current_user_data.get("id") # Get ID from dict
    logger.info(f"Super admin {current_user_id} fetching all users (skip={skip}, limit={limit})")
    try:
        user_collection = await get_user_collection()
        users_cursor = user_collection.find().skip(skip).limit(limit)
        users_list = await users_cursor.to_list(length=limit)

        # Convert DB objects to UserProfile model, handling potential missing fields gracefully
        user_profiles = []
        for user_data in users_list:
            try:
                # Validate/map subscription_tier before creating UserProfile
                raw_tier = user_data.get("subscription_tier")
                valid_tiers = {tier.value for tier in SubscriptionTier}
                if raw_tier is None:
                    validated_tier = SubscriptionTier.FREE # Default if missing
                elif raw_tier not in valid_tiers:
                    logger.warning(f"User {user_data.get('id')} has invalid subscription_tier '{raw_tier}'. Mapping to 'free'.")
                    validated_tier = SubscriptionTier.FREE # Map invalid/price IDs to free
                else:
                    validated_tier = raw_tier # Use the valid enum value

                # Ensure all required fields for UserProfile are present or provide defaults
                profile_data = {
                    "id": user_data.get("id"),
                    "username": user_data.get("username"),
                    "email": user_data.get("email"),
                    "company_name": user_data.get("company_name"),
                    "subscription_tier": validated_tier, # Use validated tier
                    "subscription_status": user_data.get("subscription_status", "inactive"), # Default if missing
                    "subscription_end_date": user_data.get("subscription_end_date"),
                    "api_key": user_data.get("api_key"),
                    "created_at": user_data.get("created_at"),
                    "is_super_admin": user_data.get("is_super_admin", False) # Include the flag
                }
                user_profiles.append(UserProfile(**profile_data))
            except Exception as model_error:
                logger.error(f"Error converting user data to UserProfile for user {user_data.get('id')}: {model_error}")
                # Optionally skip this user or handle the error differently
                continue 
        
        return user_profiles
    except Exception as e:
        logger.error(f"Failed to list users for super admin {current_user_id}: {e}", exc_info=True) # Use ID from dict
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve users")


@router.get("/users/{user_id}", response_model=UserProfile)
async def get_user_details(
    user_id: str,
    current_user_data: dict = Depends(get_current_super_admin_user) # Expect dict
):
    """
    (Super Admin) Retrieves details for a specific user.
    """
    current_admin_id = current_user_data.get("id") # Get ID from dict
    logger.info(f"Super admin {current_admin_id} fetching details for user {user_id}")
    try:
        user_collection = await get_user_collection()
        user_data = await user_collection.find_one({"id": user_id})

        if user_data is None:
            logger.warning(f"Super admin {current_admin_id} tried to fetch non-existent user {user_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Convert DB object to UserProfile model
        try:
            # Validate/map subscription_tier before creating UserProfile
            raw_tier = user_data.get("subscription_tier")
            valid_tiers = {tier.value for tier in SubscriptionTier}
            if raw_tier is None:
                validated_tier = SubscriptionTier.FREE # Default if missing
            elif raw_tier not in valid_tiers:
                logger.warning(f"User {user_data.get('id')} has invalid subscription_tier '{raw_tier}'. Mapping to 'free'.")
                validated_tier = SubscriptionTier.FREE # Map invalid/price IDs to free
            else:
                validated_tier = raw_tier # Use the valid enum value

            profile_data = {
                "id": user_data.get("id"),
                "username": user_data.get("username"),
                "email": user_data.get("email"),
                "company_name": user_data.get("company_name"),
                "subscription_tier": validated_tier, # Use validated tier
                "subscription_status": user_data.get("subscription_status", "inactive"),
                "subscription_end_date": user_data.get("subscription_end_date"),
                "api_key": user_data.get("api_key"),
                "created_at": user_data.get("created_at"),
                "is_super_admin": user_data.get("is_super_admin", False)
            }
            return UserProfile(**profile_data)
        except Exception as model_error:
            logger.error(f"Error converting user data to UserProfile for user {user_id}: {model_error}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error processing user data")

    except HTTPException as e:
        raise e # Re-raise specific HTTP exceptions
    except Exception as e:
        logger.error(f"Failed to get user details for {user_id} by super admin {current_admin_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve user details")

# --- Models for Update Requests ---

class UserStatusUpdate(BaseModel):
    is_active: bool # True to activate (set status to ACTIVE), False to deactivate (set status to INACTIVE)

class UserRoleUpdate(BaseModel):
    is_super_admin: bool

# --- Endpoints for Updates ---

@router.put("/users/{user_id}/status", status_code=status.HTTP_204_NO_CONTENT)
async def update_user_status(
    user_id: str,
    status_update: UserStatusUpdate,
    current_user_data: dict = Depends(get_current_super_admin_user) # Expect dict
):
    """
    (Super Admin) Activates or deactivates a user account by changing subscription status.
    Note: This is a simplified status change. Real-world might involve Stripe updates.
    """
    current_admin_id = current_user_data.get("id") # Get ID from dict
    logger.info(f"Super admin {current_admin_id} attempting to update status for user {user_id} to active={status_update.is_active}")

    if user_id == current_admin_id:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Super admins cannot change their own status.")

    try:
        user_collection = await get_user_collection()
        
        # Determine the target status based on the input flag
        target_status = SubscriptionStatus.ACTIVE if status_update.is_active else SubscriptionStatus.INACTIVE
        
        update_result = await user_collection.update_one(
            {"id": user_id},
            {"$set": {"subscription_status": target_status.value}}
        )

        if update_result.matched_count == 0:
            logger.warning(f"Super admin {current_admin_id} failed to update status: User {user_id} not found.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        if update_result.modified_count == 0:
             logger.warning(f"Super admin {current_admin_id} attempted to update status for user {user_id}, but no changes were made (possibly already in target state).")
             # Not necessarily an error, could return 200 OK or 304 Not Modified, but 204 is simple for now.

        logger.info(f"Super admin {current_admin_id} successfully updated status for user {user_id} to {target_status.value}")
        return # Return 204 No Content on success

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to update status for user {user_id} by super admin {current_admin_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user status")


@router.put("/users/{user_id}/role", status_code=status.HTTP_204_NO_CONTENT)
async def update_user_role(
    user_id: str,
    role_update: UserRoleUpdate,
    current_user_data: dict = Depends(get_current_super_admin_user) # Expect dict
):
    """
    (Super Admin) Grants or revokes super admin privileges for a user.
    """
    current_admin_id = current_user_data.get("id") # Get ID from dict
    logger.info(f"Super admin {current_admin_id} attempting to set super_admin={role_update.is_super_admin} for user {user_id}")

    if user_id == current_admin_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Super admins cannot change their own role.")

    try:
        user_collection = await get_user_collection()
        
        update_result = await user_collection.update_one(
            {"id": user_id},
            {"$set": {"is_super_admin": role_update.is_super_admin}}
        )

        if update_result.matched_count == 0:
            logger.warning(f"Super admin {current_admin_id} failed to update role: User {user_id} not found.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        if update_result.modified_count == 0:
             logger.warning(f"Super admin {current_admin_id} attempted to update role for user {user_id}, but no changes were made (possibly already in target state).")
             # Return 204 for simplicity

        logger.info(f"Super admin {current_admin_id} successfully updated role for user {user_id} (is_super_admin={role_update.is_super_admin})")
        return # Return 204 No Content on success

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to update role for user {user_id} by super admin {current_admin_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user role")

# TODO: Consider adding endpoint to change subscription_tier if needed by super admin
