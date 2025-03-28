# app/api/logs.py

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.models.models import ConversationEntry
from app.utils.mongo import get_db, get_conversations_collection, serialize_mongo_doc
from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.logging_config import get_module_logger

logger = get_module_logger(__name__)

router = APIRouter()

@router.get("/conversations", response_model=List[ConversationEntry])
async def get_conversations_endpoint(
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

    try:
        query_filter = {}
        if query:
            query_filter["$text"] = {"$search": query} # Enable text search if query is provided

        cursor = conversations_collection.find(query_filter).sort([("timestamp", -1)]).skip(skip).limit(page_size)
        conversations = await cursor.to_list(length=page_size)
        serialized_conversations = [serialize_mongo_doc(conv) for conv in conversations]

        return serialized_conversations
    except Exception as e:
        logger.error(f"Error fetching conversations: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve conversations")

@router.get("/conversations/{conversation_id}", response_model=ConversationEntry)
async def get_conversation_by_id(conversation_id: str, db: AsyncIOMotorClient = Depends(get_db)):
    """
    Retrieves a specific conversation by its ID.
    """
    conversations_collection = await get_conversations_collection()
    try:
        conversation = await conversations_collection.find_one({"conversation_id": conversation_id})
        if conversation:
            return ConversationEntry(**serialize_mongo_doc(conversation))
        else:
            raise HTTPException(status_code=404, detail="Conversation not found")
    except Exception as e:
        logger.error(f"Error fetching conversation by ID: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve conversation")