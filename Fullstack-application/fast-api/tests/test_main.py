# tests/test_main.py
from fastapi.testclient import TestClient
import pytest
import asyncio

# Assuming your FastAPI app instance is named 'app'
from app.main import app, get_product_comparison_manager, verify_db, startup_event  # Import the app instance, and any other necessary functions
from app.utils.mongo import get_db

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "fastapi",
        "version": "1.0.0"
    }

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to Divine Clarity API"}

@pytest.mark.asyncio
async def test_verify_db(test_db):
    # Ensure the test database is accessible
    try:
        await test_db.command("ping")
    except Exception as e:
        pytest.fail(f"Database connection failed: {e}")

@pytest.mark.asyncio
async def test_startup_event(test_db):
    # Mock the get_db dependency to use the test database
    app.dependency_overrides[get_db] = lambda: test_db
    
    # Using a try-except block to handle any exceptions that may occur during startup
    try:
        await startup_event()
    except Exception as e:
        pytest.fail(f"Startup event failed: {e}")
    finally:
        app.dependency_overrides.clear()

# Example test using get_product_comparison_manager
@pytest.mark.asyncio
async def test_compare_products_endpoint(test_db):
    # Insert test data into the product collection
    product_collection = test_db["products"]
    await product_collection.insert_many([
        {
            "id": "product_0001",
            "product_name": "Intel Core i9-13900K",
            "description": "Socket: LGA 1700 - Tdp: 125W - Cache: 36MB - Process technology: Intel 7",
            "category": "electronics",
            "business_type": "retail",
            "features": [
                "24 jader (8P+16E)",
                "32 vláken",
                "Maximální frekvence 5.8 GHz",
                "Odemčený pro přetaktování",
                "Intel UHD Graphics 770"
            ],
            "technical_specifications": {
                "socket": "LGA 1700",
                "tdp": "125W",
                "cache": "36MB",
                "process_technology": "Intel 7",
            }
        },
        {
            "id": "product_0002",
            "product_name": "AMD Ryzen 7 7700X",
            "description": "Socket: AM5 - Tdp: 105W - Cache: 32MB - Process technology: 5nm",
            "category": "electronics",
            "business_type": "retail",
            "features": [
                "8 jader",
                "16 vláken",
                "Maximální frekvence 5.4 GHz",
                "Odemčený pro přetaktování"
            ],
            "technical_specifications": {
                "socket": "AM5",
                "tdp": "105W",
                "cache": "32MB",
                "process_technology": "5nm",
            }
        }
    ])
    # Arrange
    product_comparison_manager = await get_product_comparison_manager(db=test_db)
    
    # Act
    response = client.post(
        "/api/compare_products/",
        json={
            "product_ids": ["product_0001", "product_0002"],
            "query": "Srovnej Intel Core i9-13900K vs AMD Ryzen 7 7700X"
        }
    )

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data['success'] is True
    assert "comparison" in data
    assert "insights" in data
    assert "response" in data
    # Additional assertions as necessary