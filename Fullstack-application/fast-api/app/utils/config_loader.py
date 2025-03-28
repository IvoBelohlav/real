# app/utils/config_loader.py
import json
from typing import Dict
from app.utils.logging_config import get_module_logger
from motor.motor_asyncio import AsyncIOMotorClient

logger = get_module_logger(__name__)

async def load_business_configs(db: AsyncIOMotorClient) -> Dict[str, Dict]:
    """Loads all business configurations from the database."""
    business_configs = {}
    try:
        business_configs_collection = db.get_collection("business_configs")
        async for config in business_configs_collection.find():
            business_configs[config["type"]] = config
            logger.info(f"Loaded config for business type: {config['type']}")  # Indicate which type is loaded
        logger.info("Loaded business configurations from database")
    except Exception as e:
        logger.error(f"Error loading business configurations: {e}")
    return business_configs