import jwt
import os
from datetime import datetime, timedelta
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")  # Use a strong secret in production!
ACCESS_TOKEN_EXPIRE = timedelta(minutes=15)
REFRESH_TOKEN_EXPIRE = timedelta(days=7)

def generate_token(user_id: str, expires_delta: timedelta = ACCESS_TOKEN_EXPIRE):
    expire = datetime.utcnow() + expires_delta
    payload = {
        "user_id": user_id,
        "exp": expire,
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def generate_tokens(user_id: str):
    access_token = generate_token(user_id, ACCESS_TOKEN_EXPIRE)
    refresh_token = generate_token(user_id, REFRESH_TOKEN_EXPIRE)
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