# app/utils/migrate_language_codes.py
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def migrate_language_codes():
    """Migrates language codes in existing QA items from 'cs' to 'cze' and 'en' to 'eng'."""

    mongo_uri = os.getenv("MONGO_URL")
    db_name = os.getenv("MONGO_DB_NAME")

    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]
    qa_collection = db["qa_items"]

    # Update existing documents
    update_cs = await qa_collection.update_many(
        {"language": "cs"},
        {"$set": {"language": "cze"}}
    )
    print(f"Updated {update_cs.modified_count} documents from 'cs' to 'cze'.")

    update_en = await qa_collection.update_many(
        {"language": "en"},
        {"$set": {"language": "eng"}}
    )
    print(f"Updated {update_en.modified_count} documents from 'en' to 'eng'.")

    await client.close()

if __name__ == "__main__":
    asyncio.run(migrate_language_codes())