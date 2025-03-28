# tests/performance/test_query_performance.py
import asyncio
import pytest
import time
from app.api.chat import ChatManager
from app.models.models import ChatRequest
from app.api.qa import QAManager
from app.utils.mongo import get_db
from app.services.product_comparison import ProductComparisonManager
from app.services.handlers.factory import HandlerFactory

@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.mark.asyncio
async def test_query_performance(event_loop):
    """Test the response time of the get_prioritized_response method."""
    db = await get_db()  # Get the database instance

    # Initialize QA manager and product comparison manager
    qa_manager = QAManager(db)
    await qa_manager.initialize_collections()  # Ensure collections are initialized
    await qa_manager.load_product_data()
    product_comparison_manager = ProductComparisonManager(db)
    await product_comparison_manager.initialize_collections()

    # Load business configurations
    await HandlerFactory.load_configs(db)

    chat_manager = await ChatManager.create(qa_manager=qa_manager, product_comparison_manager=product_comparison_manager)

    num_tests = 10
    total_time = 0

    for _ in range(num_tests):
        request = ChatRequest(query="Test query", language="cs")
        start_time = time.time()
        await chat_manager.get_prioritized_response(request)
        end_time = time.time()
        total_time += end_time - start_time

    average_time = total_time / num_tests
    print(f"\nAverage response time: {average_time:.4f} seconds")
    assert average_time < 1.0, f"Average response time exceeded 1 second ({average_time:.4f} seconds)"