from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.utils.dependencies import get_current_user
from app.utils.logging_config import get_module_logger
from app.utils.mongo import get_conversations_collection, serialize_mongo_doc # Import helpers
from typing import List, Dict, Any # Import types
from pymongo import DESCENDING # Import sorting order

logger = get_module_logger(__name__)
router = APIRouter()

@router.get("/conversations")
async def get_user_conversations(current_user=Depends(get_current_user)):
    """
    Get list of conversations for the current user, optionally paginated.
    """
    user_id = current_user.get("id")
    if not user_id:
         # This should technically not happen if get_current_user works correctly
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not identify user")

    try:
        conv_collection = await get_conversations_collection()
        # Filter by the authenticated user's ID
        filter_query = {"user_id": user_id}

        # Fetch conversations, sort by creation time (using _id as proxy if no timestamp)
        # Add pagination later if needed
        conversations_cursor = conv_collection.find(filter_query).sort("_id", DESCENDING) # Sort newest first
        conversations_list = await conversations_cursor.to_list(length=None) # Fetch all for now

        # Serialize results
        serialized_conversations = [serialize_mongo_doc(conv) for conv in conversations_list]

        logger.info(f"Retrieved {len(serialized_conversations)} conversations for user {user_id}")

        # Return the list of conversations
        # Consider adding pagination metadata (page, limit, total) in a future enhancement
        return {
            "conversations": serialized_conversations,
            "total": len(serialized_conversations) # Total fetched count for now
        }
    except Exception as e:
        logger.error(f"Error getting user conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversations"
        )
