from fastapi import Request, HTTPException
from datetime import datetime, timedelta
from typing import Dict, List
from app.utils.jwt import verify_token
from app.utils.logging_config import get_module_logger

logger = get_module_logger(__name__)

# Rate Limit Settings
RATE_LIMIT_DURATION = timedelta(minutes=10)  # Time window for rate limiting
MAX_REQUESTS = 1000  # Maximum requests allowed within the time window
RATE_LIMIT_DURATION_FEEDBACK = timedelta(minutes=5)
MAX_REQUESTS_FEEDBACK = 200
LOGIN_RATE_LIMIT_DURATION = timedelta(minutes=10)
MAX_LOGIN_ATTEMPTS = 20

# Store the request counts and timestamps per client IP
rate_limits: Dict[str, List[datetime]] = {}
feedback_rate_limits: Dict[str, List[datetime]] = {}
login_attempts: Dict[str, List[datetime]] = {}

async def rate_limit_middleware(request: Request, call_next):
    """
    Rate limiting middleware to limit requests per client IP.
    """
    client_ip = request.client.host
    now = datetime.now()

    # Check if the request is for the feedback endpoint
    if request.url.path == "/api/chat/feedback":
        if client_ip not in feedback_rate_limits:
            feedback_rate_limits[client_ip] = []

        # Remove timestamps older than the rate limit duration
        feedback_rate_limits[client_ip] = [
            ts for ts in feedback_rate_limits[client_ip]
            if now - ts < RATE_LIMIT_DURATION_FEEDBACK
        ]

        # Check if the client has exceeded the maximum number of requests
        if len(feedback_rate_limits[client_ip]) >= MAX_REQUESTS_FEEDBACK:
            logger.warning(f"Rate limit exceeded for feedback from IP: {client_ip}")
            raise HTTPException(
                status_code=429,
                detail="Too many feedback requests. Please try again later."
            )

        # Add the current timestamp to the client's list
        feedback_rate_limits[client_ip].append(now)

    elif request.url.path == "/api/auth/login":
        if client_ip not in login_attempts:
            login_attempts[client_ip] = []

        # Remove timestamps older than the login rate limit duration
        login_attempts[client_ip] = [
            ts for ts in login_attempts[client_ip]
            if now - ts < LOGIN_RATE_LIMIT_DURATION
        ]

        # Check if the client has exceeded the maximum number of login attempts
        if len(login_attempts[client_ip]) >= MAX_LOGIN_ATTEMPTS:
            logger.warning(f"Rate limit exceeded for login attempts from IP: {client_ip}")
            raise HTTPException(
                status_code=429,
                detail="Too many login attempts. Please try again later."
            )

        # Add the current timestamp to the client's list
        login_attempts[client_ip].append(now)
    else:
        # Existing rate limiting logic for other endpoints
        if client_ip not in rate_limits:
            rate_limits[client_ip] = []

        # Remove timestamps older than the rate limit duration
        rate_limits[client_ip] = [
            ts for ts in rate_limits[client_ip] if now - ts < RATE_LIMIT_DURATION
        ]

        # Check if the client has exceeded the maximum number of requests
        if len(rate_limits[client_ip]) >= MAX_REQUESTS:
            logger.warning(f"Rate limit exceeded from IP: {client_ip}")
            raise HTTPException(status_code=429, detail="Too many requests")

        # Add the current timestamp to the client's list
        rate_limits[client_ip].append(now)

    return await call_next(request)

async def get_user_from_token(request: Request, call_next):
    """
    Middleware to extract user_id from JWT and add it to the request state.
    """
    authorization: str = request.headers.get('Authorization')
    if not authorization:
        return await call_next(request)

    try:
        scheme, token = authorization.split()
        if scheme.lower() != 'bearer':
            return await call_next(request)
        payload = verify_token(token)
        request.state.user_id = payload.get("user_id")
    except Exception as e:
        logger.warning(f"Token verification error: {e}")
        # Don't set user_id if verification fails
        request.state.user_id = None

    try:
        # Wrap the call to the next middleware in its own try/except
        response = await call_next(request)
        return response
    except Exception as e:
        # Log the full exception details
        logger.error(f"Error in middleware chain: {str(e)}", exc_info=True)
        # Return a proper error response instead of letting the exception propagate
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred"}
        )