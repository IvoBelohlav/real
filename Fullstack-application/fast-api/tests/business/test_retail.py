# tests/business/test_retail.py
import pytest
from app.services.handlers.business.retail_handler import RetailHandler
from app.services.handlers.factory import HandlerFactory
from app.models.business import BusinessType
from app.utils.mongo import get_db
from mongomock import MongoClient
from app.utils.logging_config import get_module_logger

logger = get_module_logger(__name__)

@pytest.fixture
def mock_db():
    return MongoClient().db

@pytest.fixture
async def retail_config(mock_db):
    # Retrieve the configuration from the mock database
    config = await mock_db["business_configs"].find_one({"type": "retail"})
    return config

@pytest.fixture
async def retail_handler(mock_db, retail_config):
    """Provides an instance of RetailHandler for testing."""
    handler = RetailHandler("retail")
    handler.config = await retail_config  # Assign the config directly to the handler
    return handler

@pytest.mark.asyncio
async def test_retail_handler_creation(retail_handler):
    """Test that the RetailHandler is created with the correct business type."""
    assert await retail_handler.business_type == "retail"
    assert await retail_handler.config is not None

@pytest.mark.asyncio
async def test_retail_handle_comparison(retail_handler):
    """Test comparison handling for retail products."""
    product1 = {
        "product_name": "Product A",
        "category": "electronics",
        "business_type": "retail",
        "price": 100
    }
    product2 = {
        "product_name": "Product B",
        "category": "electronics",
        "business_type": "retail",
        "price": 200
    }
    result = await retail_handler.handle_comparison(product1, product2, "compare")
    assert "comparison_summary" in result

@pytest.mark.asyncio
async def test_retail_validate_product(retail_handler):
    """Test product validation for retail products."""
    valid_product = {
        "product_name": "Valid Product",
        "category": "electronics",
        "business_type": "retail",
        "price": 100
    }
    invalid_product = {
        "product_name": "",
        "category": "electronics",
        "business_type": "retail",
        "price": -50
    }
    assert await retail_handler.validate_product(valid_product) is True
    assert await retail_handler.validate_product(invalid_product) is False

@pytest.mark.asyncio
async def test_retail_config_loading(retail_handler, retail_config):
    """Test that configuration is loaded correctly for retail handler."""
    assert await retail_handler.config["type"] == "retail"