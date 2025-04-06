# app/api/docs.py
from fastapi import APIRouter, Depends, HTTPException, status
from app.utils.dependencies import get_current_user
from app.utils.logging_config import get_module_logger

logger = get_module_logger(__name__)
router = APIRouter()

@router.get("/docs/api")
async def get_api_docs(current_user=Depends(get_current_user)):
    """
    Get API documentation.
    """
    try:
        # Return basic API doc structure
        return {
            "version": "1.0.0",
            "endpoints": [
                {
                    "path": "/api/users/me",
                    "method": "GET",
                    "description": "Get current user profile"
                },
                {
                    "path": "/api/subscriptions",
                    "method": "GET",
                    "description": "Get user subscription information"
                },
                {
                    "path": "/api/dashboard/stats",
                    "method": "GET",
                    "description": "Get user dashboard statistics"
                }
            ]
        }
    except Exception as e:
        logger.error(f"Error getting API docs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve API documentation"
        ) 