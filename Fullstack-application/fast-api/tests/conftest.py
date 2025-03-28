# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
import os
import sys
import asyncio
import mongomock

# Add the project root to the sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Correct import based on the project structure
from app.main import app
from app.utils.mongo import get_db

@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()

@pytest.fixture(scope="session")
def test_db():
    """Create a mock MongoDB client for testing."""
    client = mongomock.MongoClient()
    db = client[os.getenv("MONGO_DB_NAME", "test_db")]

    # Insert mock data for business_configs collection
    db["business_configs"].insert_many([
        {
            "type": "retail",
            "attributes": {
                "store_type": "online",
                "industry": "electronics"
            },
            "query_patterns": [
                "do you have (.*) in stock",
                "what is the price of (.*)",
                "is (.*) available online"
            ],
            "response_templates": {
                "product_availability": "Yes, the {product} is currently in stock.",
                "price_inquiry": "The price of {product} is {price}."
            },
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
        },
        {
            "type": "service",
            "attributes": {
                "service_type": "consulting",
                "industry": "IT"
            },
            "query_patterns": [
                "do you offer (.*) services",
                "how much does (.*) service cost",
                "what is included in (.*) service"
            ],
            "response_templates": {
                "service_availability": "Yes, we offer {service} services.",
                "price_inquiry": "The cost of {service} service is {price}."
            },
            "validation_rules": {
                "service_name": {"required": True, "type": "string"},
                "price": {"required": True, "type": "number", "min": 0}
            },
            "category_configs": {
                "IT_consulting": {
                    "key_features": ["expertise", "experience", "certifications"],
                    "comparison_metrics": ["hourly_rate", "project_success_rate"]
                }
            }
        },
        {
            "type": "consulting",
            "attributes": {
                "consulting_type": "business",
                "industry": "management"
            },
            "query_patterns": [
                "do you provide (.*) consulting",
                "what is your hourly rate for (.*)",
                "can you help with (.*) strategy"
            ],
            "response_templates": {
                "consulting_availability": "Yes, we provide {consulting} consulting services.",
                "price_inquiry": "Our hourly rate for {consulting} is {price}."
            },
            "validation_rules": {
                "consulting_name": {"required": True, "type": "string"},
                "hourly_rate": {"required": True, "type": "number", "min": 0}
            },
            "category_configs": {
                "business_consulting": {
                    "key_features": ["industry_expertise", "years_of_experience", "client_success_rate"],
                    "comparison_metrics": ["hourly_rate", "client_satisfaction"]
                }
            }
        },
        {
            "type": "manufacturing",
            "attributes": {
                "product_type": "electronics",
                "production_capacity": "10000 units/month"
            },
            "query_patterns": [
                "what is the lead time for (.*)",
                "do you manufacture (.*)",
                "can you customize (.*)"
            ],
            "response_templates": {
                "lead_time_inquiry": "The lead time for {product} is {lead_time}.",
                "product_availability": "Yes, we manufacture {product}.",
                "customization_inquiry": "Yes, we offer customization options for {product}."
            },
            "validation_rules": {
                "product_name": {"required": True, "type": "string"},
                "lead_time": {"required": True, "type": "integer", "min": 0}
            },
            "category_configs": {
                "electronics_manufacturing": {
                    "key_features": ["production_capacity", "quality_certifications", "material_sourcing"],
                    "comparison_metrics": ["production_cost", "defect_rate"]
                }
            }
        }
    ])

    return db

@pytest.fixture(scope="module")
def test_client(test_db):
    """Create a TestClient instance for testing FastAPI endpoints."""
    # Override the get_db dependency to use the test database
    def override_get_db():
        return test_db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()