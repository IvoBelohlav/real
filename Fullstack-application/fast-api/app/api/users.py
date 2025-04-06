# app/api/users.py
from fastapi import APIRouter, Depends, HTTPException, status
# Import get_user_collection from mongo.py instead of dependencies.py
from fastapi import APIRouter, Depends, HTTPException, status
# Import get_user_collection from mongo.py instead of dependencies.py
from app.utils.dependencies import get_current_user
from app.utils.mongo import get_user_collection # Correct import source
from app.models.user import UserProfile, UserUpdate, PasswordChangeRequest, SubscriptionTier # Import new models and SubscriptionTier
from app.utils.logging_config import get_module_logger
from app.api.subscriptions import get_tier_from_price_id # Import the helper function

logger = get_module_logger(__name__)
router = APIRouter()

@router.get("/users/me", response_model=UserProfile)
async def get_current_user_profile(current_user=Depends(get_current_user)):
    """
    Get the current user's profile information.
    Requires authentication.
    """
    try:
        # Transform the user object into a UserProfile model
        # Ensure all fields exist or use .get() for safety
        # Get tier string (Price ID) and end date from user dict
        tier_str = current_user.get("subscription_tier")
        end_date = current_user.get("subscription_current_period_end") # Use correct field name

        # Convert Price ID string to SubscriptionTier enum
        subscription_tier_enum = get_tier_from_price_id(tier_str) if tier_str else SubscriptionTier.FREE

        # Create the UserProfile model instance
        user_profile = UserProfile(
            id=current_user.get("id"),
            username=current_user.get("username"),
            email=current_user.get("email"),
            company_name=current_user.get("company_name"),
            subscription_tier=subscription_tier_enum, # Pass the enum value
            subscription_status=current_user.get("subscription_status"),
            subscription_end_date=end_date, # Pass the correct end date
            api_key=current_user.get("api_key"),
            created_at=current_user.get("created_at"),
            is_super_admin=current_user.get("is_super_admin", False) # Add the super admin flag
        )
        return user_profile
    except Exception as e:
        # Log the specific Pydantic validation error if it occurs
        logger.error(f"Error creating UserProfile model for user {current_user.get('id')}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user profile due to data inconsistency."
        )

@router.put("/users/profile", response_model=dict) # Keep response simple for now
async def update_user_profile(
    user_data: UserUpdate, # Use UserUpdate model
    current_user=Depends(get_current_user)
):
    """
    Update the current user's profile information.
    Requires authentication.
    """
    try:
        user_collection = await get_user_collection() # This call is now correct

        # Use Pydantic's exclude_unset=True to only get provided fields
        update_data = user_data.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided for update")

        # Update the user in the database
        result = await user_collection.update_one(
            {"id": current_user["id"]},
            {"$set": update_data}
        )

        if result.modified_count == 0:
            return {"message": "No changes were made"}

        return {"message": "Profile updated successfully"}
    except Exception as e:
        logger.error(f"Error updating user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile"
        )

@router.post("/users/change-password", response_model=dict) # Keep response simple
async def change_password(
    password_data: PasswordChangeRequest, # Use PasswordChangeRequest model
    current_user=Depends(get_current_user)
):
    """
    Change the current user's password.
    Requires authentication.
    """
    from app.utils.password import verify_password, get_password_hash

    try:
        user_collection = await get_user_collection() # This call is now correct

        # Access data directly from the Pydantic model
        current_password = password_data.current_password
        new_password = password_data.new_password

        # Verify current password
        if not verify_password(current_password, current_user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )

        # Hash new password
        hashed_password = get_password_hash(new_password)

        # Update password in database
        await user_collection.update_one(
            {"id": current_user["id"]},
            {"$set": {"password_hash": hashed_password}}
        )

        return {"message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )
