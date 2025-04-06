# app/api/logs.py

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.models.models import ConversationEntry
from app.utils.mongo import get_db, get_conversations_collection, serialize_mongo_doc
from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.logging_config import get_module_logger
from app.utils.dependencies import get_current_active_customer

logger = get_module_logger(__name__)

router = APIRouter()

@router.get("/conversations", response_model=List[ConversationEntry])
async def get_conversations_endpoint(
    current_user: dict = Depends(get_current_active_customer),
    db: AsyncIOMotorClient = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
    query: Optional[str] = Query(None, description="Search query"),
):
    """
    Retrieves conversations with pagination and optional search.
    """
    logger.info(f"Fetching conversations - page: {page}, page_size: {page_size}, query: {query}")
    conversations_collection = await get_conversations_collection()
    skip = (page - 1) * page_size
    user_id = current_user["id"]

    try:
        # Start with user_id filter for multi-tenancy
        query_filter = {"user_id": user_id}
        
        # Add text search if query is provided
        if query:
            query_filter["$text"] = {"$search": query}

        cursor = conversations_collection.find(query_filter).sort([("timestamp", -1)]).skip(skip).limit(page_size)
        conversations = await cursor.to_list(length=page_size)
        serialized_conversations = [serialize_mongo_doc(conv) for conv in conversations]

        return serialized_conversations
    except Exception as e:
        logger.error(f"Error fetching conversations: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve conversations")

@router.get("/conversations/{conversation_id}", response_model=ConversationEntry)
async def get_conversation_by_id(
    conversation_id: str, 
    current_user: dict = Depends(get_current_active_customer),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """
    Retrieves a specific conversation by its ID.
    """
    conversations_collection = await get_conversations_collection()
    user_id = current_user["id"]
    
    try:
        # Add user_id filter for multi-tenancy
        conversation = await conversations_collection.find_one({
            "conversation_id": conversation_id,
            "user_id": user_id
        })
        
        if conversation:
            return ConversationEntry(**serialize_mongo_doc(conversation))
        else:
            raise HTTPException(status_code=404, detail="Conversation not found")
    except Exception as e:
        logger.error(f"Error fetching conversation by ID: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve conversation")