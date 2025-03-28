# tests/integration/test_response_generation.py
import pytest
from app.api.chat import ChatManager
from app.models.models import ChatRequest
from app.api.qa import QAManager, QAConfig
from app.services.product_comparison import ProductComparisonManager
from unittest.mock import AsyncMock

@pytest.fixture
def mock_qa_manager():
    mock = AsyncMock(spec=QAManager)
    mock.get_greeting_response.return_value = "Ahoj! Jak vám mohu pomoci?"
    return mock

@pytest.fixture
def mock_product_comparison_manager():
    mock = AsyncMock(spec=ProductComparisonManager)
    mock.compare_products.return_value = {
        "success": True,
        "response": "Product A is better than Product B.",
        "comparison": {"details": "some details"},
        "insights": []
    }
    return mock

@pytest.fixture
async def chat_manager(mock_qa_manager, mock_product_comparison_manager):
    return await ChatManager.create(mock_qa_manager, mock_product_comparison_manager)

@pytest.mark.asyncio
async def test_fallback_response(chat_manager):
    # Assuming no handler or QA match is found, should return a fallback response
    response = await chat_manager.get_prioritized_response(ChatRequest(query="unknown query", language="cs"))
    assert response["reply"] == QAConfig.FALLBACK_RESPONSES["cs"]["fallback"]
    assert response["source"] == "error"

@pytest.mark.asyncio
async def test_greeting_response(chat_manager, mock_qa_manager):
    mock_qa_manager.classify_intent.return_value = {"intent": "greeting", "confidence": 0.9}
    response = await chat_manager.get_prioritized_response(ChatRequest(query="Ahoj", language="cs"))
    assert response["reply"] == "Ahoj! Jak vám mohu pomoci?"
    assert response["source"] == "greeting"

@pytest.mark.asyncio
async def test_product_comparison(chat_manager, mock_product_comparison_manager):
    response = await chat_manager.get_prioritized_response(
        ChatRequest(query="Compare product A and B", language="cs")
    )
    assert response["reply"] == "Product A is better than Product B."
    assert response["source"] == "comparison"

# Add more tests for different scenarios and edge cases as needed