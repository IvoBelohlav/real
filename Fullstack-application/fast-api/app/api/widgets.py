# app/api/widgets.py
from fastapi import APIRouter, Depends, HTTPException, status
from app.utils.dependencies import get_current_user
from app.utils.logging_config import get_module_logger

logger = get_module_logger(__name__)
router = APIRouter()

@router.get("/widgets")
async def get_user_widgets(current_user=Depends(get_current_user)):
    """
    Get list of widgets for the current user.
    """
    try:
        # Return empty list for now
        return {
            "widgets": [],
            "total": 0
        }
    except Exception as e:
        logger.error(f"Error getting user widgets: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve widgets"
        ) 