# app/api/knowledge_base.py
from fastapi import APIRouter, Depends, HTTPException, status
from app.utils.dependencies import get_current_user
from app.utils.logging_config import get_module_logger

logger = get_module_logger(__name__)
router = APIRouter()

@router.get("/knowledge-base/status")
async def get_knowledge_base_status(current_user=Depends(get_current_user)):
    """
    Get status of the knowledge base.
    """
    try:
        # Return mock status
        return {
            "status": "active",
            "documents_count": 0,
            "last_updated": None
        }
    except Exception as e:
        logger.error(f"Error getting knowledge base status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve knowledge base status"
        ) 