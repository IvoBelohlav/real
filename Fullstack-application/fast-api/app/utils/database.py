import os
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME")

client = AsyncIOMotorClient(MONGODB_URL)
database = client[MONGO_DB_NAME]
user_collection = database.get_collection("users")
conversations_collection = database.get_collection("conversations")
logs_collection = database.get_collection("logs")

async def add_user(db: AsyncIOMotorClient, user_data: dict):
    try:
        await user_collection.insert_one(user_data)
        return user_data
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email already registered")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def get_user_by_id(db: AsyncIOMotorClient, user_id: str):
    try:
        user = await user_collection.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def get_user_by_email(db: AsyncIOMotorClient, email: str):
    try:
        user = await user_collection.find_one({"email": email.lower()})
        print("Querying for email:", email)  # Debugging log
        print("User found in DB (or None):", user)
        return user
    except Exception as e:
        print(f"Error in get_user_by_email: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def save_conversation(query: str, response: str, user_id: str = None):
    new_conversation = {
        "query": query,
        "response": response,
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": user_id
    }
    await logs_collection.insert_one(new_conversation)
    return new_conversation

async def get_conversations(user_id: str = None):
    try:
        filter_query = {}
        if user_id:
            filter_query["user_id"] = user_id
            
        conversations = await conversations_collection.find(filter_query).to_list(length=None)
        return conversations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def get_logs(user_id: str = None):
    try:
        filter_query = {}
        if user_id:
            filter_query["user_id"] = user_id
            
        logs = await logs_collection.find(filter_query).to_list(length=None)
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))