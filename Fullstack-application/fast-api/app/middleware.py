from fastapi import Request, HTTPException
from datetime import datetime, timedelta
from typing import Dict, List
from app.utils.jwt import verify_token
from app.utils.logging_config import get_module_logger
import time
import traceback
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from fastapi.responses import JSONResponse

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

# Add middleware classes that were referenced in main.py
class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging request and response details.
    """
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.logger = get_module_logger(__name__)

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log request details
        client_host = request.client.host if request.client else "unknown"
        self.logger.info(f"Request: {request.method} {request.url.path} from {client_host}")
        
        try:
            response = await call_next(request)
            
            # Log response details
            process_time = time.time() - start_time
            self.logger.info(f"Response: {request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.3f}s")
            
            return response
        except Exception as e:
            process_time = time.time() - start_time
            self.logger.error(f"Error during request processing: {str(e)} - Time: {process_time:.3f}s")
            raise

class ErrorLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for catching and logging errors.
    """
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.logger = get_module_logger(__name__)

    async def dispatch(self, request: Request, call_next):
        try:
            # Pass through to the next middleware or endpoint
            response = await call_next(request)
            return response
        except Exception as e:
            # Log the full exception with traceback
            self.logger.error(f"Unhandled exception during request: {str(e)}")
            self.logger.error(traceback.format_exc())
            
            # Return a JSON response with error details
            # Only create a new response if one doesn't already exist
            return JSONResponse(
                status_code=500,
                content={"detail": "An internal server error occurred"}
            )

async def rate_limit_middleware(request: Request, call_next):
    """
    Rate limiting middleware to limit requests per client IP.
    """
    client_ip = request.client.host
    now = datetime.now()

    try:
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
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many feedback requests. Please try again later."}
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
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many login attempts. Please try again later."}
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
                return JSONResponse(
                    status_code=429, 
                    content={"detail": "Too many requests"}
                )

            # Add the current timestamp to the client's list
            rate_limits[client_ip].append(now)

        # If we get here, rate limit checks passed
        response = await call_next(request)
        return response
        
    except Exception as e:
        logger.error(f"Error in rate limiting middleware: {e}", exc_info=True)
        # Continue with the request even if rate limiting fails
        return await call_next(request)

async def get_user_from_token(request: Request, call_next):
    """
    Middleware to extract user_id from JWT and add it to the request state.
    """
    try:
        authorization: str = request.headers.get('Authorization')
        if authorization:
            try:
                scheme, token = authorization.split()
                if scheme.lower() == 'bearer':
                    payload = verify_token(token)
                    request.state.user_id = payload.get("user_id")
                else:
                    request.state.user_id = None
            except Exception as e:
                logger.warning(f"Token verification error: {e}")
                # Don't set user_id if verification fails
                request.state.user_id = None
        else:
            request.state.user_id = None
            
        # Continue with the request
        response = await call_next(request)
        return response
        
    except Exception as e:
        # Log the full exception details
        logger.error(f"Error in user token middleware: {str(e)}", exc_info=True)
        # Return a proper error response instead of letting the exception propagate
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred"}
        )