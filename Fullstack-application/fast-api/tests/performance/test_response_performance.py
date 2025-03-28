# tests/performance/test_response_performance.py
import pytest
import time
from app.api.chat import ChatManager
from app.models.models import ChatRequest
from app.api.qa import QAManager
from app.utils.mongo import get_db
from app.services.product_comparison import ProductComparisonManager
from app.services.handlers.factory import HandlerFactory
import asyncio

@pytest.mark.asyncio
async def test_response_time_under_load(event_loop):
    """Test response time with multiple concurrent requests."""
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

    num_concurrent_requests = 5
    request = ChatRequest(query="Test query", language="cs")

    async def send_request():
        start_time = time.time()
        await chat_manager.get_prioritized_response(request)
        return time.time() - start_time

    tasks = [send_request() for _ in range(num_concurrent_requests)]
    response_times = await asyncio.gather(*tasks)

    avg_response_time = sum(response_times) / len(response_times)
    print(f"\nAverage response time under load: {avg_response_time:.4f} seconds")
    assert avg_response_time < 2.0, f"Average response time under load exceeded 2 seconds ({avg_response_time:.4f} seconds)"