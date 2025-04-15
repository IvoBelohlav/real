# app/api/auth.py
import os
import uuid
import secrets
from datetime import datetime, timedelta, timezone

# Original imports
from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from app.models.user import UserLogin, User, UserCreate, SubscriptionStatus, SubscriptionTier
from app.models.models import AuthResponse, MessageResponse, RefreshTokenRequest # Import new models
from app.utils.password import get_password_hash, verify_password
from app.utils.jwt import generate_token, generate_tokens, verify_token # Keep verify_token
from app.utils.dependencies import generate_api_key
from app.utils.email import send_verification_email, send_password_reset_email
from app.utils.mongo import get_db, USER_COLLECTION_NAME, get_user_collection # Added get_user_collection
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.logging_config import get_module_logger
from typing import Dict, Optional

load_dotenv()

logger = get_module_logger(__name__)

router = APIRouter()

async def initialize_admin_user(db: AsyncIOMotorClient = Depends(get_db)):
    """
    Creates an admin user if it doesn't exist based on environment variables.
    Raises an exception if admin user creation fails.
    """
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    admin_api_key = os.getenv("ADMIN_API_KEY", "admin_dev_api_key_123456")

    if not admin_email or not admin_password:
        error_msg = "WARNING: ADMIN_EMAIL or ADMIN_PASSWORD environment variables not set."
        logger.error(error_msg)
        raise Exception(error_msg)

    # Get user collection from the passed db instance
    user_collection = db[USER_COLLECTION_NAME] if isinstance(db, AsyncIOMotorClient) else db.get_collection(USER_COLLECTION_NAME)

    try:
        user = await user_collection.find_one({"email": admin_email.lower()})
        if user:
            if not user.get("api_key"):
                logger.info("Admin user exists but doesn't have an API key. Setting API key.")
                await user_collection.update_one({"email": admin_email.lower()}, {"$set": {"api_key": admin_api_key}})
            logger.info("Admin user already exists.")
            return

        hashed_password = get_password_hash(admin_password)
        admin_user = User(
            id=str(uuid.uuid4()), email=admin_email.lower(), username="admin", password_hash=hashed_password,
            created_at=datetime.now(timezone.utc), subscription_tier=SubscriptionTier.ENTERPRISE, # Use ENTERPRISE tier for admin
            is_email_verified=True, api_key=admin_api_key
        )
        await user_collection.insert_one(admin_user.model_dump())
        logger.info("Admin user created successfully with API key.")

    except Exception as e:
        logger.error(f"Error creating admin user: {e}")
        raise Exception(f"Failed to create admin user: {e}")

@router.post("/auth/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, background_tasks: BackgroundTasks, db: AsyncIOMotorClient = Depends(get_db)):
    """
    Register a new user with email verification. Returns a success message.
    """
    user_collection = await get_user_collection()
    existing_user = await user_collection.find_one({"email": user_data.email.lower()})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    verification_token = secrets.token_urlsafe(32)
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        id=str(uuid.uuid4()), email=user_data.email.lower(), username=user_data.username, password_hash=hashed_password,
        created_at=datetime.now(timezone.utc), subscription_tier=SubscriptionTier.FREE, subscription_status=SubscriptionStatus.INACTIVE,
        company_name=user_data.company_name, verification_token=verification_token, is_email_verified=False, api_key=None # Set api_key to None initially
    )
    await user_collection.insert_one(new_user.model_dump())
    background_tasks.add_task(send_verification_email, user_data.email, verification_token)
    return MessageResponse(message="User registered successfully. Please check your email for verification.")

@router.get("/auth/verify-email/{token}", response_model=MessageResponse)
async def verify_email(token: str):
    """
    Verify user email with token. Returns a success message.
    """
    user_collection = await get_user_collection()
    user = await user_collection.find_one({"verification_token": token})
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification token")
    await user_collection.update_one({"verification_token": token}, {"$set": {"is_email_verified": True}, "$unset": {"verification_token": ""}})
    return MessageResponse(message="Email verified successfully. You can now log in.")


@router.post("/auth/forgot-password", response_model=MessageResponse)
async def forgot_password(email: Dict[str, str], background_tasks: BackgroundTasks):
    """
    Send password reset email. Always returns a generic success message.
    """
    user_email = email.get("email")
    if not user_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required")
    user_collection = await get_user_collection()
    user = await user_collection.find_one({"email": user_email.lower()})
    if not user:
        # Still return success message to prevent email enumeration
        return MessageResponse(message="If your email is registered, you will receive a password reset link.")
    reset_token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    await user_collection.update_one({"email": user_email.lower()}, {"$set": {"reset_password_token": reset_token, "reset_password_expires": expires}})
    background_tasks.add_task(send_password_reset_email, user_email, reset_token)
    return MessageResponse(message="If your email is registered, you will receive a password reset link.")

@router.post("/auth/reset-password/{token}", response_model=MessageResponse)
async def reset_password(token: str, password: Dict[str, str]):
    """
    Reset password with token. Returns a success message.
    """
    new_password = password.get("password")
    if not new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password is required")
    user_collection = await get_user_collection()
    user = await user_collection.find_one({"reset_password_token": token, "reset_password_expires": {"$gt": datetime.now(timezone.utc)}})
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    hashed_password = get_password_hash(new_password)
    await user_collection.update_one({"reset_password_token": token}, {"$set": {"password_hash": hashed_password}, "$unset": {"reset_password_token": "", "reset_password_expires": ""}})
    return MessageResponse(message="Password reset successfully. You can now log in with your new password.")

# Reverted login endpoint to return tokens in body
@router.post("/auth/login", response_model=AuthResponse, status_code=status.HTTP_200_OK)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncIOMotorClient = Depends(get_db)):
    """
    Logs in a user and returns access and refresh tokens.
    """
    logger.info("Login request received")
    logger.debug(f"Form data: username={form_data.username}, password=[REDACTED]")
    user_collection = await get_user_collection()
    user = await user_collection.find_one({"email": form_data.username.lower()})
    logger.debug(f"User from DB (or None): {user}")
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    disable_verification = os.getenv("DISABLE_EMAIL_VERIFICATION", "false").lower() == "true"
    if not disable_verification and user.get("subscription_tier") != "admin" and not user.get("is_email_verified", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified. Please check your email for verification link.")
    user_data = {"email": user["email"], "subscription_status": user.get("subscription_status", "inactive"), "subscription_tier": user.get("subscription_tier", "free")}
    logger.debug(f"Including user data in token: {user_data}")
    tokens = generate_tokens(user["id"], user_data)
    # Include the API key in the response
    api_key = user.get("api_key")
    if not api_key:
        # Generate API key if missing (should ideally not happen for verified users, but as a fallback)
        logger.warning(f"User {user['email']} logged in but missing API key. Generating one.")
        api_key = generate_api_key()
        await user_collection.update_one({"_id": user["_id"]}, {"$set": {"api_key": api_key}})
        logger.info(f"Generated and saved new API key for user {user['email']}: {api_key[:5]}...") # Log generated key

    # --- Add explicit logging before returning ---
    logger.debug(f"API Key value before returning AuthResponse for user {user['email']}: {api_key}")
    # --- End explicit logging ---

    logger.info(f"Login successful for {user['email']}, returning tokens and API key.")
    return AuthResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type="bearer",
        api_key=api_key # Add api_key here
    )

@router.post("/auth/guest", response_model=AuthResponse) # Assuming guest also gets tokens
async def guest_auth():
    """
    Generates access and refresh tokens for a guest user.
    """
    try:
        guest_user_id = str(uuid.uuid4())
        guest_data = {"email": f"guest_{guest_user_id[:8]}@example.com", "subscription_status": "guest", "subscription_tier": "free"}
        # Generate both access and refresh tokens for guest
        # Removed incorrect access_token_expire_minutes argument
        tokens = generate_tokens(guest_user_id, guest_data) 
        return AuthResponse(access_token=tokens["access_token"], refresh_token=tokens["refresh_token"], token_type="bearer")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Reverted refresh endpoint to accept token in body and return new tokens in body
@router.post("/auth/refresh", response_model=AuthResponse, status_code=status.HTTP_200_OK)
async def refresh_access_token(refresh_token_request: RefreshTokenRequest): # Use Pydantic model
    """
    Use a refresh token (provided in request body) to get a new access token.
    """
    try:
        token = refresh_token_request.refresh_token # Read from Pydantic model
        try:
            payload = verify_token(token) # Verify the refresh token itself
            user_id = payload.get("user_id")
            token_type = payload.get("type")

            if not user_id or token_type != "refresh": # Ensure it's a refresh token
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
            user_collection = await get_user_collection()
            user = await user_collection.find_one({"id": user_id})
            if not user:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
            user_data = {"email": user["email"], "subscription_status": user.get("subscription_status", "inactive"), "subscription_tier": user.get("subscription_tier", "free")}
            logger.debug(f"Including user data in refreshed token: {user_data}")
            tokens = generate_tokens(user_id, user_data) # Generate new pair
            # Return new tokens in body
            return AuthResponse(access_token=tokens["access_token"], refresh_token=tokens["refresh_token"], token_type="bearer")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Refresh token error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
