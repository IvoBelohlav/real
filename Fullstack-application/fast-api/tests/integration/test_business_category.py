# tests/integration/test_business_category.py
import pytest
from app.services.handlers.factory import HandlerFactory
from app.services.handlers.business.retail_handler import RetailHandler
from app.services.handlers.category.electronics_handler import ElectronicsHandler
from app.utils.mongo import get_db
from mongomock import MongoClient
import asyncio

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()

@pytest.fixture
async def mock_db():
    client = MongoClient()
    db = client["test_db"]
    yield db
    client.close()

@pytest.fixture
async def retail_config(mock_db):
    # Insert a mock business configuration into the database
    config = {
        "type": "retail",
        "attributes": {
            "store_type": "online",
            "industry": "electronics"
        },
        "query_patterns": [],
        "response_templates": {},
        "validation_rules": {
            "product_name": {"required": True, "type": "string"},
            "price": {"required": True, "type": "number", "min": 0}
        },
        "category_configs": {
            "electronics": {
                "key_features": ["display", "processor", "memory"],
                "comparison_metrics": ["price_performance", "display_quality"]
            }
        }
    }
    await mock_db["business_configs"].insert_one(config)
    return config

@pytest.mark.asyncio
async def test_handler_retrieval(mock_db, retail_config):
    """Test retrieving handlers from the factory with database configuration."""
    # Ensure the factory can load configuration from the database
    await HandlerFactory.load_configs(mock_db)

    retail_handler = await HandlerFactory.get_handler("retail")
    assert isinstance(retail_handler, RetailHandler)
    assert retail_handler.config["type"] == "retail"

    electronics_handler = await HandlerFactory.get_handler("retail", "electronics")
    assert isinstance(electronics_handler, ElectronicsHandler)

@pytest.mark.asyncio
async def test_handler_not_found(mock_db):
    """Test that an error is raised when no handler is found."""
    # Ensure the factory can load configuration from the database
    await HandlerFactory.load_configs(mock_db)
    
    with pytest.raises(ValueError):
        await HandlerFactory.get_handler("unknown_business_type")