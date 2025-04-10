

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "ai_widget")
WIDGET_CONFIG_COLLECTION_NAME = "widget_configs"
INDEX_TO_DROP = "business_id_1" # The name of the old index
FIELD_TO_REMOVE = "id" # The problematic hardcoded field

async def cleanup_collection():
    if not MONGO_URL:
        logger.error("MONGO_URL environment variable not set.")
        return # Corrected indentation

    client = None # Initialize client to None
    try: # Corrected indentation
            logger.info(f"Connecting to MongoDB at {MONGO_URL}...")
            client = AsyncIOMotorClient(MONGO_URL)
            db = client[MONGO_DB_NAME]
            collection = db[WIDGET_CONFIG_COLLECTION_NAME]
            logger.info(f"Connected to database '{MONGO_DB_NAME}', collection '{WIDGET_CONFIG_COLLECTION_NAME}'.")

            # --- Step 1: Drop the old business_id index ---
            logger.info(f"Checking existing indexes on '{WIDGET_CONFIG_COLLECTION_NAME}'...")
            index_info = await collection.index_information()
            logger.info(f"Existing indexes: {index_info}")

            if INDEX_TO_DROP in index_info:
                logger.info(f"Attempting to drop index '{INDEX_TO_DROP}'...")
                await collection.drop_index(INDEX_TO_DROP)
                logger.info(f"Successfully dropped index '{INDEX_TO_DROP}'.")
            else:
                logger.info(f"Index '{INDEX_TO_DROP}' not found, no need to drop.")

            # --- Step 2: Remove the hardcoded 'id' field from all documents ---
            logger.info(f"Attempting to remove field '{FIELD_TO_REMOVE}' from all documents in '{WIDGET_CONFIG_COLLECTION_NAME}'...")
            update_result = await collection.update_many(
                {FIELD_TO_REMOVE: {"$exists": True}}, # Find documents where the field exists
                {"$unset": {FIELD_TO_REMOVE: ""}}     # Remove the field
            )
            logger.info(f"Removed '{FIELD_TO_REMOVE}' field from {update_result.modified_count} documents.")

            # --- Step 3: Verify or create the unique user_id index ---
            index_info_after = await collection.index_information()
            user_id_index_name = "user_id_1" # Default name for index on user_id
            if user_id_index_name in index_info_after:
                 index_details = index_info_after[user_id_index_name]
                 is_unique = index_details.get('unique', False)
                 logger.info(f"Index '{user_id_index_name}' exists. Unique: {is_unique}")
                 if not is_unique:
                     logger.warning(f"Index '{user_id_index_name}' exists but is NOT unique. Attempting to recreate.")
                     try:
                         await collection.drop_index(user_id_index_name)
                         await collection.create_index("user_id", unique=True)
                         logger.info(f"Recreated index '{user_id_index_name}' as unique.")
                     except Exception as recreate_err:
                         logger.error(f"Failed to recreate unique index '{user_id_index_name}': {recreate_err}")
            else:
                 logger.warning(f"Index '{user_id_index_name}' does not exist. It should be created on app startup by create_indexes.")

    except Exception as e: # Corrected indentation
        logger.error(f"An error occurred: {e}", exc_info=True)
    finally: # Corrected indentation
        if client:
            client.close() # Corrected indentation
            logger.info("MongoDB connection closed.")

if __name__ == "__main__": # Corrected indentation
    asyncio.run(cleanup_collection())
