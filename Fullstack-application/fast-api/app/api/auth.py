# app/api/auth.py
import os
import uuid
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from app.models.user import UserLogin, User, UserCreate, SubscriptionStatus, SubscriptionTier
from app.models.models import AuthResponse
from app.utils.password import get_password_hash, verify_password
from app.utils.jwt import generate_token, generate_tokens
from app.utils.dependencies import generate_api_key
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.mongo import get_db, get_user_collection
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

    if not admin_email or not admin_password:
        error_msg = "WARNING: ADMIN_EMAIL or ADMIN_PASSWORD environment variables not set."
        logger.error(error_msg)
        raise Exception(error_msg)

    user_collection = await get_user_collection()

    try:
        user = await user_collection.find_one({"email": admin_email.lower()})
        if user:
            logger.info("Admin user already exists.")
            return

        hashed_password = get_password_hash(admin_password)
        admin_user = User(
            id=str(uuid.uuid4()),
            email=admin_email.lower(),
            username="admin",  # Or get from env variable
            password_hash=hashed_password,
            created_at=datetime.now(timezone.utc),
            subscription_tier=SubscriptionTier.ADMIN,  # Admin tier
            is_email_verified=True  # Admin is verified by default
        )

        await user_collection.insert_one(admin_user.model_dump())
        logger.info("Admin user created successfully.")

    except Exception as e:
        logger.error(f"Error creating admin user: {e}")
        raise Exception(f"Failed to create admin user: {e}")

# Mock email sending function (in production, use a real email service)
async def send_verification_email(email: str, token: str):
    """
    Mock function to send a verification email.
    In production, replace this with actual email sending logic.
    """
    frontend_url = os.getenv("DASHBOARD_URL", "http://localhost:3000")
    verification_url = f"{frontend_url}/verify-email?token={token}"
    
    logger.info(f"[MOCK] Sending verification email to {email}")
    logger.info(f"[MOCK] Verification URL: {verification_url}")
    
    # In a real implementation, you would send an actual email here
    # Example: await send_email_with_template(email, "Verify Your Email", template="verification", context={"url": verification_url})

# Mock password reset email
async def send_password_reset_email(email: str, token: str):
    """
    Mock function to send a password reset email.
    In production, replace this with actual email sending logic.
    """
    frontend_url = os.getenv("DASHBOARD_URL", "http://localhost:3000")
    reset_url = f"{frontend_url}/reset-password?token={token}"
    
    logger.info(f"[MOCK] Sending password reset email to {email}")
    logger.info(f"[MOCK] Reset URL: {reset_url}")
    
    # In a real implementation, you would send an actual email here

@router.post("/auth/register")
async def register_user(
    user_data: UserCreate, 
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorClient = Depends(get_db)
):
    """
    Register a new user with email verification.
    """
    user_collection = await get_user_collection()
    
    # Check if email already exists
    existing_user = await user_collection.find_one({"email": user_data.email.lower()})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user with verification token
    verification_token = secrets.token_urlsafe(32)
    hashed_password = get_password_hash(user_data.password)
    
    new_user = User(
        id=str(uuid.uuid4()),
        email=user_data.email.lower(),
        username=user_data.username,
        password_hash=hashed_password,
        created_at=datetime.now(timezone.utc),
        subscription_tier=SubscriptionTier.FREE,
        subscription_status=SubscriptionStatus.INACTIVE,
        company_name=user_data.company_name,
        verification_token=verification_token,
        is_email_verified=False,
        api_key=generate_api_key()  # Generate API key on registration
    )
    
    await user_collection.insert_one(new_user.model_dump())
    
    # Send verification email in the background
    background_tasks.add_task(send_verification_email, user_data.email, verification_token)
    
    return {"message": "User registered successfully. Please check your email for verification."}

@router.get("/auth/verify-email/{token}")
async def verify_email(token: str):
    """
    Verify user email with token.
    """
    user_collection = await get_user_collection()
    
    user = await user_collection.find_one({"verification_token": token})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )
    
    # Mark email as verified and remove token
    await user_collection.update_one(
        {"verification_token": token},
        {
            "$set": {"is_email_verified": True},
            "$unset": {"verification_token": ""}
        }
    )
    
    return {"message": "Email verified successfully. You can now log in."}

@router.post("/auth/forgot-password")
async def forgot_password(email: Dict[str, str], background_tasks: BackgroundTasks):
    """
    Send password reset email.
    """
    user_email = email.get("email")
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )
    
    user_collection = await get_user_collection()
    
    user = await user_collection.find_one({"email": user_email.lower()})
    if not user:
        # Return success even if email doesn't exist to prevent email enumeration
        return {"message": "If your email is registered, you will receive a password reset link."}
    
    # Generate reset token and set expiration
    reset_token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Update user with reset token
    await user_collection.update_one(
        {"email": user_email.lower()},
        {
            "$set": {
                "reset_password_token": reset_token,
                "reset_password_expires": expires
            }
        }
    )
    
    # Send reset email in the background
    background_tasks.add_task(send_password_reset_email, user_email, reset_token)
    
    return {"message": "If your email is registered, you will receive a password reset link."}

@router.post("/auth/reset-password/{token}")
async def reset_password(token: str, password: Dict[str, str]):
    """
    Reset password with token.
    """
    new_password = password.get("password")
    if not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password is required"
        )
    
    user_collection = await get_user_collection()
    
    # Find user with valid token that hasn't expired
    user = await user_collection.find_one({
        "reset_password_token": token,
        "reset_password_expires": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Update password and remove reset token
    hashed_password = get_password_hash(new_password)
    await user_collection.update_one(
        {"reset_password_token": token},
        {
            "$set": {"password_hash": hashed_password},
            "$unset": {
                "reset_password_token": "",
                "reset_password_expires": ""
            }
        }
    )
    
    return {"message": "Password reset successfully. You can now log in with your new password."}

@router.post("/auth/login", response_model=AuthResponse)
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if email is verified (except for admin users)
    if user.get("subscription_tier") != "admin" and not user.get("is_email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please check your email for verification link.",
        )

    access_token = generate_token(user["id"])
    refresh_token = generate_token(user["id"], expires_delta=timedelta(days=7))  # Example: refresh token expires in 7 days

    return AuthResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/auth/guest")
async def guest_auth():
    """
    Generates a token for a guest user.
    """
    try:
        guest_user_id = str(uuid.uuid4())
        token = generate_token(guest_user_id, expires_delta=timedelta(days=1))
        return {"token": token, "token_type": "bearer"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))