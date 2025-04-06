# app/utils/mongo.py
import os
import re
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure, OperationFailure
from dotenv import load_dotenv
from typing import Any, Dict, List, Optional
from pymongo import ASCENDING, TEXT
from app.utils.logging_config import get_module_logger
from functools import lru_cache
import json
from bson import ObjectId
from datetime import datetime, timezone
from app.models.contact_admin_models import ContactSubmissionModel
from app.models.shop_info import ShopInfo

load_dotenv()

logger = get_module_logger(__name__)

MONGO_URL = os.getenv("MONGO_URL")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "ai_widget")

# Make the database client connection cached and reusable
@lru_cache()
def get_mongo_client() -> AsyncIOMotorClient:
    client = AsyncIOMotorClient(MONGO_URL)
    return client

async def get_db():
    """
    Returns the MongoDB database connection.
    """
    client = get_mongo_client()
    db = client[MONGO_DB_NAME]
    
    return db

USER_COLLECTION_NAME = "users"
CONVERSATIONS_COLLECTION_NAME = "conversations"
LOGS_COLLECTION_NAME = "logs"
QA_COLLECTION_NAME = "qa_items"
GUIDED_CHAT_FLOWS_COLLECTION_NAME = "guided_chat_flows"
PRODUCT_COLLECTION_NAME = "products"
COMPARISON_CONFIGS_COLLECTION_NAME = "comparison_configs"
SYNONYM_COLLECTION_NAME = "synonyms"
WIDGET_CONFIG_COLLECTION_NAME = "widget_configs"
PRODUCT_INTENT_KEYWORDS_COLLECTION_NAME = "product_intent_keywords"
CONTACT_SUBMISSIONS_COLLECTION_NAME = "contact_submissions"
FAQ_WIDGET_COLLECTION_NAME = "widget_faqs"
HUMAN_CHAT_COLLECTION_NAME = "human_chat_sessions"
SHOP_INFO_COLLECTION_NAME = "shop_info"  # New collection for shop info

class MongoJSONEncoder(json.JSONEncoder):
    """
    Enhanced JSON encoder for MongoDB documents that properly handles
    ObjectId, datetime, and other special types
    """
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        # Handle any other non-serializable types
        if hasattr(o, 'model_dump'):
            return o.model_dump()
        elif hasattr(o, '__dict__'):
            return o.__dict__
        # Try to make sets and other iterables serializable
        try:
            return list(o) if hasattr(o, '__iter__') and not isinstance(o, (str, bytes, dict)) else o
        except:
            pass
        return super().default(o)

def serialize_mongo_doc(doc: Any, deep_serialize: bool = True) -> Any:
    """
    Convert MongoDB document to serializable format with comprehensive
    handling of nested non-serializable objects.
    
    Args:
        doc: Document to serialize
        deep_serialize: Whether to recursively serialize nested objects
        
    Returns:
        Serialized document
    """
    if doc is None:
        return None
        
    # Handle special case for lists
    if isinstance(doc, list):
        return [serialize_mongo_doc(item, deep_serialize) for item in doc]
        
    if deep_serialize and isinstance(doc, dict):
        # Process each field individually for better control
        result = {}
        for key, value in doc.items():
            # Handle _id conversion to id
            if key == "_id":
                result["id"] = str(value) if isinstance(value, ObjectId) else value
                continue
                
            # Handle datetime objects
            if isinstance(value, datetime):
                result[key] = value.isoformat()
            # Handle nested dictionaries
            elif isinstance(value, dict):
                result[key] = serialize_mongo_doc(value, deep_serialize)
            # Handle lists with potential nested objects
            elif isinstance(value, list):
                result[key] = [serialize_mongo_doc(item, deep_serialize) if isinstance(item, dict) else
                              item.isoformat() if isinstance(item, datetime) else
                              str(item) if isinstance(item, ObjectId) else
                              item for item in value]
            # Handle ObjectId
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            # Everything else
            else:
                result[key] = value
                
        return result
    else:
        # Original implementation for non-deep serialization or non-dict objects
        try:
            serialized_doc = json.loads(json.dumps(doc, cls=MongoJSONEncoder))
            # Remap MongoDB's _id to id for Pydantic models
            if isinstance(serialized_doc, dict) and "_id" in serialized_doc:
                serialized_doc["id"] = serialized_doc.pop("_id")
            
            logger.debug(f"Serialized MongoDB document: {serialized_doc}")
            return serialized_doc
        except Exception as e:
            logger.error(f"Error serializing MongoDB document: {str(e)}")
            # Return a manually sanitized version as fallback
            if isinstance(doc, dict):
                sanitized = {}
                for k, v in doc.items():
                    if k == "_id":
                        sanitized["id"] = str(v)
                    elif isinstance(v, (int, float, str, bool)) or v is None:
                        sanitized[k] = v
                    elif isinstance(v, (datetime, ObjectId)):
                        sanitized[k] = str(v)
                    else:
                        try:
                            sanitized[k] = str(v)
                        except:
                            sanitized[k] = "Unserializable value"
                return sanitized
            return str(doc)

async def get_user_collection():
    db = await get_db()
    return db.get_collection(USER_COLLECTION_NAME)

async def get_conversations_collection():
    db = await get_db()
    return db.get_collection(CONVERSATIONS_COLLECTION_NAME)

async def get_logs_collection():
    db = await get_db()
    return db.get_collection(LOGS_COLLECTION_NAME)

async def get_qa_collection():
    db = await get_db()
    return db.get_collection(QA_COLLECTION_NAME)

async def get_guided_chat_flows_collection():
    """Returns the guided chat flows collection."""
    db = await get_db()
    return db.get_collection(GUIDED_CHAT_FLOWS_COLLECTION_NAME)

async def get_product_collection():
    """Returns the products collection."""
    db = await get_db()
    return db.get_collection(PRODUCT_COLLECTION_NAME)

async def get_comparison_configs_collection():
    """Returns the comparison configs collection."""
    db = await get_db()
    return db.get_collection(COMPARISON_CONFIGS_COLLECTION_NAME)

async def get_synonym_collection():
    """Returns the synonym collection."""
    db = await get_db()
    return db.get_collection(SYNONYM_COLLECTION_NAME)

async def get_widget_config_collection():
    """Returns the widget config collection."""
    db = await get_db()
    return db.get_collection(WIDGET_CONFIG_COLLECTION_NAME)

async def get_product_intent_keywords_collection():
    """Returns the product intent keywords collection."""
    db = await get_db()
    return db.get_collection(PRODUCT_INTENT_KEYWORDS_COLLECTION_NAME)

async def get_contact_submissions_collection():
    """Returns the contact submissions collection."""
    db = await get_db()
    return db.get_collection(CONTACT_SUBMISSIONS_COLLECTION_NAME)

async def get_widget_faq_collection():
    """Returns the widget FAQ collection."""
    db = await get_db()
    return db.get_collection(FAQ_WIDGET_COLLECTION_NAME)

async def get_human_chat_collection():
    """Returns the human chat sessions collection."""
    db = await get_db()
    return db.get_collection(HUMAN_CHAT_COLLECTION_NAME)

async def get_business_configs_collection():
    """Returns the business configurations collection."""
    db = await get_db()
    return db.get_collection("business_configs")

async def get_shop_info_collection():
    """Returns the shop info collection."""
    db = await get_db()
    return db.get_collection(SHOP_INFO_COLLECTION_NAME)

async def get_comparison_config(category: str, user_id: str = None) -> Dict:
    """
    Retrieves a comparison configuration by category.
    
    Args:
        category: The category to search for
        user_id: The ID of the user who owns the config (for multi-tenancy)
        
    Returns:
        The comparison config object
    """
    collection = await get_comparison_configs_collection()
    
    # Build filter query with user_id if provided
    filter_query = {"category": category}
    if user_id:
        filter_query["user_id"] = user_id
        
    config = await collection.find_one(filter_query)
    return serialize_mongo_doc(config) if config else None

async def create_comparison_config(config_data: Dict) -> Dict:
    """
    Creates a new comparison configuration.
    
    Args:
        config_data: The configuration data to insert
        
    Returns:
        The created comparison config object
    """
    collection = await get_comparison_configs_collection()
    try:
        result = await collection.insert_one(config_data)
        config = await collection.find_one({"_id": result.inserted_id})
        return serialize_mongo_doc(config) if config else None
    except Exception as e:
        logger.error(f"Failed to create comparison config: {e}")
        raise HTTPException(status_code=500, detail="Failed to create comparison config")

async def update_comparison_config(category: str, config_data: Dict, user_id: str = None) -> Dict:
    """
    Updates an existing comparison configuration.
    
    Args:
        category: The category to update
        config_data: The updated configuration data
        user_id: The ID of the user who owns the config (for multi-tenancy)
        
    Returns:
        The updated comparison config object
    """
    collection = await get_comparison_configs_collection()
    try:
        # Build filter query with user_id if provided
        filter_query = {"category": category}
        if user_id:
            filter_query["user_id"] = user_id
        
        result = await collection.update_one(
            filter_query,
            {"$set": config_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail=f"Comparison config for category '{category}' not found")

        updated_config = await collection.find_one(filter_query)
        return serialize_mongo_doc(updated_config) if updated_config else None
    except Exception as e:
        logger.error(f"Failed to update comparison config: {e}")
        raise HTTPException(status_code=500, detail="Failed to update comparison config")

async def delete_comparison_config(category: str, user_id: str = None):
    """
    Deletes a comparison configuration.
    
    Args:
        category: The category to delete
        user_id: The ID of the user who owns the config (for multi-tenancy)
    """
    collection = await get_comparison_configs_collection()
    try:
        # Build filter query with user_id if provided
        filter_query = {"category": category}
        if user_id:
            filter_query["user_id"] = user_id
        
        result = await collection.delete_one(filter_query)
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail=f"Comparison config for category '{category}' not found")
    except Exception as e:
        logger.error(f"Failed to delete comparison config: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete comparison config")

async def get_all_comparison_configs(user_id: str = None):
    """
    Retrieves all comparison configurations.
    
    Args:
        user_id: The ID of the user to filter by (for multi-tenancy)
        
    Returns:
        List of comparison config objects
    """
    collection = await get_comparison_configs_collection()
    
    # Apply user_id filter if provided
    filter_query = {}
    if user_id:
        filter_query["user_id"] = user_id
        
    configs = await collection.find(filter_query).to_list(length=None)
    return [serialize_mongo_doc(config) for config in configs]

async def get_synonyms_from_db(db: AsyncIOMotorClient) -> Dict[str, List[str]]:
    """Loads synonyms from MongoDB."""
    synonym_map: Dict[str, List[str]] = {}
    collection = await get_synonym_collection()

    logger.debug(f"Attempting to load synonyms from collection: {collection.name}, database: {collection.database.name}")

    try:
        synonym_doc = await collection.find_one({})

        if synonym_doc:
            logger.debug(f"Synonym document found: {synonym_doc}")

            for word, synonyms_list in synonym_doc.items():
                if word != "_id":
                    synonym_map[word] = [syn.lower() for syn in synonyms_list]

            logger.debug(f"Extracted synonym map: {synonym_map}")
        else:
            logger.warning("No synonym document found in collection.")

    except Exception as e:
        logger.error(f"Error loading synonyms from DB: {e}", exc_info=True)
    return synonym_map


async def create_synonym(word: str, synonyms: List[str]) -> Dict:
    """Creates a new synonym entry."""
    collection = await get_synonym_collection()
    try:
        result = await collection.insert_one({"word": word, "synonyms": synonyms})
        synonym_entry = await collection.find_one({"_id": result.inserted_id})
        return serialize_mongo_doc(synonym_entry) if synonym_entry else None
    except Exception as e:
        logger.error(f"Failed to create synonym entry: {e}")
        raise HTTPException(status_code=500, detail="Failed to create synonym entry")

async def get_synonym(word: str) -> Dict:
    """Retrieves a synonym entry by word."""
    collection = await get_synonym_collection()
    synonym_entry = await collection.find_one({"word": word})
    return serialize_mongo_doc(synonym_entry) if synonym_entry else None

async def update_synonym(word: str, synonyms: List[str]) -> Dict:
    """Updates an existing synonym entry."""
    collection = await get_synonym_collection()
    try:
        result = await collection.update_one(
            {"word": word},
            {"$set": {"synonyms": synonyms}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail=f"Synonym entry for word '{word}' not found")

        updated_synonym_entry = await collection.find_one({"word": word})
        return serialize_mongo_doc(updated_synonym_entry) if updated_synonym_entry else None
    except Exception as e:
        logger.error(f"Failed to update synonym entry: {e}")
        raise HTTPException(status_code=500, detail="Failed to update synonym entry")

async def delete_synonym(word: str):
    """Deletes a synonym entry."""
    collection = await get_synonym_collection()
    try:
        result = await collection.delete_one({"word": word})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail=f"Synonym entry for word '{word}' not found")
    except Exception as e:
        logger.error(f"Failed to delete synonym entry: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete synonym entry")

async def get_all_synonyms():
    """Retrieves all synonym entries."""
    collection = await get_synonym_collection()
    synonym_entries = await collection.find().to_list(length=None)
    return [serialize_mongo_doc(entry) for entry in synonym_entries]

async def create_widget_config(config_data: Dict) -> Dict:
    """
    Creates a new widget configuration.
    
    Args:
        config_data: The configuration data to insert (must include user_id for multi-tenancy)
        
    Returns:
        The created widget configuration
    """
    collection = await get_widget_config_collection()
    try:
        # Ensure user_id is present for multi-tenancy
        if "user_id" not in config_data:
            raise HTTPException(status_code=400, detail="user_id is required for widget configuration")
            
        result = await collection.insert_one(config_data)
        config = await collection.find_one({"_id": result.inserted_id})
        return serialize_mongo_doc(config) if config else None
    except Exception as e:
        logger.error(f"Failed to create widget config: {e}")
        raise HTTPException(status_code=500, detail="Failed to create widget config")

async def get_widget_config(user_id: str) -> Dict:
    """
    Retrieves a widget configuration by user_id.
    
    Args:
        user_id: The ID of the user who owns the config
        
    Returns:
        The widget configuration
    """
    collection = await get_widget_config_collection()
    config = await collection.find_one({"user_id": user_id})
    return serialize_mongo_doc(config) if config else None

async def update_widget_config(user_id: str, config_data: Dict) -> Dict:
    """
    Updates an existing widget configuration.
    
    Args:
        user_id: The ID of the user who owns the config
        config_data: The updated configuration data
        
    Returns:
        The updated widget configuration
    """
    collection = await get_widget_config_collection()
    try:
        # Ensure user_id is in filter but not in the update data to prevent changing ownership
        update_data = {k: v for k, v in config_data.items() if k != "user_id"}
        
        result = await collection.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            # If no config exists, create one with the provided data
            config_data["user_id"] = user_id
            return await create_widget_config(config_data)

        updated_config = await collection.find_one({"user_id": user_id})
        return serialize_mongo_doc(updated_config) if updated_config else None
    except Exception as e:
        logger.error(f"Failed to update widget config: {e}")
        raise HTTPException(status_code=500, detail="Failed to update widget config")

async def delete_widget_config(user_id: str) -> bool:
    """
    Deletes a widget configuration.
    
    Args:
        user_id: The ID of the user who owns the config
        
    Returns:
        True if deleted successfully, False otherwise
    """
    collection = await get_widget_config_collection()
    try:
        result = await collection.delete_one({"user_id": user_id})
        return result.deleted_count > 0
    except Exception as e:
        logger.error(f"Failed to delete widget config: {e}")
        return False

async def get_all_widget_configs(user_id: str = None) -> List[Dict]:
    """
    Retrieves all widget configurations.
    
    Args:
        user_id: The ID of the user to filter by (for multi-tenancy)
        
    Returns:
        List of widget configurations
    """
    collection = await get_widget_config_collection()
    
    # Apply user_id filter if provided
    filter_query = {}
    if user_id:
        filter_query["user_id"] = user_id
        
    configs = await collection.find(filter_query).to_list(length=None)
    return [serialize_mongo_doc(config) for config in configs]


async def create_contact_submission(submission_data: Dict) -> ContactSubmissionModel:
    """Creates a new contact submission."""
    collection = await get_contact_submissions_collection()
    try:
        result = await collection.insert_one(submission_data)
        submission = await collection.find_one({"_id": result.inserted_id})
        return ContactSubmissionModel(**serialize_mongo_doc(submission)) if submission else None
    except Exception as e:
        logger.error(f"Failed to create contact submission: {e}")
        raise HTTPException(status_code=500, detail="Failed to create contact submission")

async def get_contact_submissions_by_user(user_id: str) -> List[Dict[str, Any]]:
    """
    Retrieves all contact submissions for a specific user.
    
    Args:
        user_id: The ID of the user
        
    Returns:
        List of contact submissions as dictionaries
    """
    collection = await get_contact_submissions_collection()
    submissions_cursor = collection.find({"user_id": user_id}).sort([("submittedAt", -1)])
    submissions = await submissions_cursor.to_list(length=None)
    
    # Convert to dict instead of returning model objects directly
    return [serialize_mongo_doc(submission) for submission in submissions]

async def delete_contact_submission(submission_id: str, user_id: str = None) -> bool:
    """
    Deletes a contact submission by ID.
    
    Args:
        submission_id: The ID of the submission to delete
        user_id: The ID of the user who owns the submission (for multi-tenancy)
        
    Returns:
        True if successful, False if submission not found
    """
    collection = await get_contact_submissions_collection()
    try:
        # Build filter query with user_id if provided
        filter_query = {"_id": ObjectId(submission_id)}
        if user_id:
            filter_query["user_id"] = user_id
        
        result = await collection.delete_one(filter_query)
        return result.deleted_count > 0
    except Exception as e:
        logger.error(f"Failed to delete contact submission: {e}")
        return False

async def update_contact_submission_status(submission_id: str, completed: bool, user_id: str = None) -> bool:
    """
    Updates the completed status of a contact submission.
    
    Args:
        submission_id: The ID of the submission to update
        completed: The new completion status
        user_id: The ID of the user who owns the submission (for multi-tenancy)
        
    Returns:
        True if successful, False if submission not found
    """
    collection = await get_contact_submissions_collection()
    try:
        # Build filter query with user_id if provided
        filter_query = {"_id": ObjectId(submission_id)}
        if user_id:
            filter_query["user_id"] = user_id
        
        result = await collection.update_one(
            filter_query,
            {"$set": {"completed": completed}}
        )
        return result.matched_count > 0
    except Exception as e:
        logger.error(f"Failed to update contact submission status: {e}")
        return False

# Shop Info CRUD functions
async def get_shop_info(language: str = "cs", user_id: str = None) -> Dict:
    """
    Retrieves shop information for the specified language and user.
    Creates default shop info if none exists.
    
    Args:
        language: Language code (default: "cs" for Czech)
        user_id: User ID for multi-tenancy filtering
        
    Returns:
        Dictionary with shop information
    """
    collection = await get_shop_info_collection()
    
    # Build filter query including user_id if provided
    filter_query = {"language": language}
    if user_id:
        filter_query["user_id"] = user_id
    
    shop_info = await collection.find_one(filter_query)
    
    if not shop_info:
        # Create default shop info if none exists
        default_info = ShopInfo(
            shop_name="DvojkavIT",
            legal_name="DvojkavIT s.r.o.",
            tagline="Digitální řešení s vizí",
            description_short="Nová generace digitálních tvůrců, která vznikla v roce 2024.",
            description_long="Jsme DvojkavIT, nová generace digitálních tvůrců, která vznikla v roce 2024. Spojuje nás vášeň pro online svět a touha dělat věci jinak, lépe. Nejsme jen kodéři a designéři, jsme stratégové a vizionáři, kteří vám pomohou dosáhnout vašich online cílů.",
            primary_email="info@dvojkavit.com",
            primary_phone="+420 123 456 789",
            website="https://www.dvojkavit.com",
            founded_year=2024,
            business_type="Digital Agency",
            services=["webové stránky na míru", "e-shopy", "digitální marketing"],
            language=language,
            ai_prompt_summary="Jsme DvojkavIT, nová generace digitálních tvůrců, která vznikla v roce 2024. Spojuje nás vášeň pro online svět a touha dělat věci jinak, lépe. Jako stratégové a vizionáři vytváříme inovativní digitální řešení, která vám pomohou dosáhnout vašich online cílů.",
            ai_faq_facts=[
                "DvojkavIT byla založena v roce 2024",
                "Specializujeme se na webové stránky a e-shopy na míru",
                "Sídlíme v České republice",
                "Nabízíme kompletní digitální řešení pro firmy"
            ],
            user_id=user_id  # Add user_id to default info
        )
        
        try:
            # Try to use upsert instead of insert_one to handle duplicate key errors
            await collection.update_one(
                filter_query,
                {"$setOnInsert": default_info.model_dump()},
                upsert=True
            )
            # Get the document after insertion/update
            shop_info = await collection.find_one(filter_query)
        except Exception as e:
            logger.error(f"Error creating default shop info: {e}")
            # If there was an error, try to get existing record
            shop_info = await collection.find_one(filter_query)
    
    return serialize_mongo_doc(shop_info) if shop_info else None

async def update_shop_info(shop_info_update: Dict, language: str = "cs", user_id: str = None) -> Dict:
    """
    Updates shop information for the specified language and user.
    
    Args:
        shop_info_update: Dictionary with fields to update
        language: Language code (default: "cs" for Czech)
        user_id: User ID for multi-tenancy filtering
        
    Returns:
        Updated shop information dictionary
    """
    collection = await get_shop_info_collection()
    
    # Add updated timestamp
    shop_info_update["updated_at"] = datetime.now(timezone.utc)
    
    # Build filter query including user_id if provided
    filter_query = {"language": language}
    if user_id:
        filter_query["user_id"] = user_id
    
    # Update the document
    await collection.update_one(
        filter_query,
        {"$set": shop_info_update},
        upsert=True
    )
    
    # Retrieve and return the updated document
    updated_info = await collection.find_one(filter_query)
    return serialize_mongo_doc(updated_info) if updated_info else None

async def index_exists(collection, index_name):
    """Checks if an index with the given name exists on the collection."""
    return index_name in await collection.index_information()

async def create_indexes():
    """Creates all necessary indexes in the MongoDB collections."""
    logger.info("Creating MongoDB indexes...")
    try:
        # User Collection Indexes
        user_collection = await get_user_collection()
        await user_collection.create_index("email", unique=True)
        await user_collection.create_index("id", unique=True)
        await user_collection.create_index("api_key", unique=True, sparse=True)  # API key index
        await user_collection.create_index("stripe_customer_id", sparse=True)  # Stripe customer ID index
        await user_collection.create_index("verification_token", sparse=True)  # Email verification token
        await user_collection.create_index("reset_password_token", sparse=True)  # Password reset token
        await user_collection.create_index("authorized_domains", sparse=True)  # Authorized domains for API key
        
        # Conversation Collection Indexes
        conv_collection = await get_conversations_collection()
        # Check if index exists before creating it
        index_info = await conv_collection.index_information()
        if "conversation_id_1" in index_info:
            logger.info("Conversation ID index already exists, skipping creation")
        else:
            await conv_collection.create_index("conversation_id", unique=True)
        
        await conv_collection.create_index("user_id")  # For multi-tenancy filtering
        
        # Product Collection Indexes
        product_collection = await get_product_collection()
        # Make product id index sparse to handle null values
        await product_collection.create_index("id", unique=True, sparse=True)
        await product_collection.create_index("user_id")  # For multi-tenancy filtering
        
        # Widget Config Collection Indexes
        widget_config_collection = await get_widget_config_collection()
        try:
            await widget_config_collection.create_index("business_id", unique=True)
        except Exception as e:
            logger.warning(f"Widget config business_id index error (continuing): {e}")
        
        await widget_config_collection.create_index("user_id")  # For multi-tenancy filtering
        
        # FAQ Collection Indexes
        faq_collection = await get_widget_faq_collection()
        try:
            await faq_collection.create_index("id", unique=True, sparse=True)
        except Exception as e:
            logger.warning(f"FAQ id index error (continuing): {e}")
        
        await faq_collection.create_index("user_id")  # For multi-tenancy filtering
        
        # Guided Chat Collection Indexes
        guided_chat_collection = await get_guided_chat_flows_collection()
        try:
            await guided_chat_collection.create_index("id", unique=True, sparse=True)
        except Exception as e:
            logger.warning(f"Guided chat id index error (continuing): {e}")
        
        await guided_chat_collection.create_index("user_id")  # For multi-tenancy filtering
        
        # Human Chat Collection Indexes
        human_chat_collection = await get_human_chat_collection()
        try:
            await human_chat_collection.create_index("session_id", unique=True, sparse=True)
        except Exception as e:
            logger.warning(f"Human chat session_id index error (continuing): {e}")
        
        await human_chat_collection.create_index("user_id")  # For multi-tenancy filtering

        # Shop Info Collection Indexes
        shop_info_collection = await get_shop_info_collection()
        # Attempt to drop the old conflicting index first (if it exists)
        try:
            await shop_info_collection.drop_index("language_1")
            logger.info("Successfully dropped old 'language_1' index from shop_info collection.")
        except Exception as e:
            # Ignore error if index doesn't exist
            if "index not found" in str(e).lower():
                logger.info("Old 'language_1' index not found, skipping drop.")
            else:
                logger.warning(f"Could not drop old 'language_1' index (maybe permissions?): {e}")
        
        # Ensure uniqueness per user per language with the correct compound index
        try:
            await shop_info_collection.create_index([("user_id", ASCENDING), ("language", ASCENDING)], name="user_id_1_language_1", unique=True)
            logger.info("Successfully created compound index 'user_id_1_language_1' on shop_info collection.")
        except Exception as e:
             # Log if index creation fails, but might be okay if it already exists correctly
             if "index already exists" in str(e).lower() or "IndexOptionsConflict" in str(e).lower():
                 logger.warning(f"Compound index 'user_id_1_language_1' likely already exists: {e}")
             else:
                 logger.error(f"Failed to create compound index 'user_id_1_language_1': {e}")
                 # Consider raising the error depending on desired strictness
                 # raise

        # ... (rest of the indexes remain the same)

        logger.info("MongoDB indexes created successfully")
    except Exception as e:
        # Log error but don't fail startup for index errors
        # This allows the application to start even if indexes already exist
        logger.error(f"Error creating MongoDB indexes: {e}")
        if "IndexKeySpecsConflict" in str(e) or "DuplicateKeyError" in str(e):
            logger.warning("Index already exists with different options or duplicate keys found. This may not be a critical issue.")
        else:
            raise

async def verify_db():
    """
    Verifies the MongoDB connection with detailed error reporting
    """
    try:
        client = get_mongo_client()
        
        # Log connection details (sanitize if needed)
        logger.info(f"Attempting connection with client: {client}")

        # Try to get server info first
        server_info = await client.server_info()
        logger.info(f"Connected to MongoDB version: {server_info.get('version')}")

        # Try to access the specific database
        db = client[os.getenv("MONGO_DB_NAME", "ai_widget")]
        logger.info(f"Accessing database: {db.name}")

        # Try to list collections
        collections = await db.list_collection_names()
        logger.info(f"Available collections: {collections}")

        # Try a simple command
        await db.command("ping")
        logger.info("Database ping successful")

        return True

    except ConnectionFailure as e:
        logger.error(f"MongoDB Connection Failure: {str(e)}")
        if hasattr(e, 'details'):
            logger.error(f"Connection details: {e.details}")
        return False

    except OperationFailure as e:
        logger.error(f"MongoDB Operation Failure: {str(e)}")
        if hasattr(e, 'details'):
            logger.error(f"Operation details: {e.details}")
        if e.code == 18:  # Authentication error
            logger.error("Authentication failed. Check username, password, and authentication database")
        return False

    except Exception as e:
        logger.error(f"Unexpected error during MongoDB verification: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        if hasattr(e, '__dict__'):
            logger.error(f"Error attributes: {e.__dict__}")
        return False

async def get_user_domains(user_id: str) -> List[str]:
    """
    Get the list of authorized domains for a user.
    
    Args:
        user_id: The ID of the user
        
    Returns:
        List of authorized domains
    """
    collection = await get_user_collection()
    user = await collection.find_one({"id": user_id})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return user.get("authorized_domains", [])

async def add_user_domain(user_id: str, domain: str) -> List[str]:
    """
    Add a domain to a user's list of authorized domains.
    
    Args:
        user_id: The ID of the user
        domain: The domain to add
        
    Returns:
        Updated list of authorized domains
    """
    collection = await get_user_collection()
    user = await collection.find_one({"id": user_id})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Get current domains and add new one if not already present
    domains = user.get("authorized_domains", [])
    if domain not in domains:
        domains.append(domain)
        
        # Update user with new domains list
        await collection.update_one(
            {"id": user_id},
            {"$set": {"authorized_domains": domains}}
        )
        
    return domains

async def remove_user_domain(user_id: str, domain: str) -> List[str]:
    """
    Remove a domain from a user's list of authorized domains.
    
    Args:
        user_id: The ID of the user
        domain: The domain to remove
        
    Returns:
        Updated list of authorized domains
    """
    collection = await get_user_collection()
    user = await collection.find_one({"id": user_id})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Get current domains and remove the specified one
    domains = user.get("authorized_domains", [])
    if domain in domains:
        domains.remove(domain)
        
        # Update user with new domains list
        await collection.update_one(
            {"id": user_id},
            {"$set": {"authorized_domains": domains}}
        )
        
    return domains
