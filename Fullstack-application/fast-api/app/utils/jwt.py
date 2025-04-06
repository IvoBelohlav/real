import jwt
import os
from datetime import datetime, timedelta
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")  # Use a strong secret in production!
ACCESS_TOKEN_EXPIRE = timedelta(minutes=15)
REFRESH_TOKEN_EXPIRE = timedelta(days=7)

def generate_token(user_id: str, expires_delta: timedelta = ACCESS_TOKEN_EXPIRE, user_data: dict = None):
    expire = datetime.utcnow() + expires_delta
    payload = {
        "user_id": user_id,
        "exp": expire,
        "iat": datetime.utcnow()
    }
    
    # Include additional user data in the token payload if provided
    if user_data:
        if "email" in user_data:
            payload["email"] = user_data["email"]
        if "subscription_status" in user_data:
            payload["subscription_status"] = user_data["subscription_status"]
        if "subscription_tier" in user_data:
            payload["subscription_tier"] = user_data["subscription_tier"]
    
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def generate_tokens(user_id: str, user_data: dict = None):
    access_token = generate_token(user_id, ACCESS_TOKEN_EXPIRE, user_data)
    refresh_token = generate_token(user_id, REFRESH_TOKEN_EXPIRE, user_data)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token
    }

def verify_token(token: str):
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return decoded
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def decode_token_without_verification(token: str):
    """
    Decode a JWT token without verifying its signature or expiration.
    This is useful for examining token contents when verification is not needed.
    
    Args:
        token: The JWT token string
        
    Returns:
        The decoded token payload
        
    Raises:
        HTTPException: If the token is malformed or cannot be decoded
    """
    try:
        # Decode without verification
        decoded = jwt.decode(token, options={"verify_signature": False, "verify_exp": False}, algorithms=["HS256"])
        return decoded
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token format: {str(e)}")