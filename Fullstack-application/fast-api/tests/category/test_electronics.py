# tests/category/test_electronics.py
import pytest
from app.services.handlers.category.electronics_handler import ElectronicsHandler
from app.utils.mongo import get_db
from mongomock import MongoClient

@pytest.fixture
def mock_db():
    return MongoClient().db

@pytest.fixture
async def electronics_handler(mock_db):
    """Provides an instance of ElectronicsHandler for testing."""
    handler = ElectronicsHandler("electronics")
    return handler

@pytest.mark.asyncio
async def test_electronics_handle_comparison(electronics_handler):
    """Test comparison handling for electronics products."""
    product1 = {
        "product_name": "Laptop X",
        "category": "electronics",
        "technical_specifications": {"processor": "Intel i7", "RAM": "16GB"}
    }
    product2 = {
        "product_name": "Laptop Y",
        "category": "electronics",
        "technical_specifications": {"processor": "AMD Ryzen 9", "RAM": "32GB"}
    }
    result = await electronics_handler.handle_comparison(product1, product2, "compare laptops")
    assert "comparison_summary" in result

@pytest.mark.asyncio
async def test_electronics_validate_product(electronics_handler):
    """Test product validation for electronics products."""
    valid_product = {
        "product_name": "Laptop X",
        "category": "electronics",
        "technical_specifications": {"processor": "Intel i7", "RAM": "16GB"}
    }
    invalid_product = {
        "product_name": "Laptop Y",
        "category": "electronics",
        "technical_specifications": {"processor": "", "RAM": "unknown"}
    }
    assert await electronics_handler.validate_product(valid_product) is True  # Assuming validation passes for valid data
    assert await electronics_handler.validate_product(invalid_product) is False