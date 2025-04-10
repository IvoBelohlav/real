from fastapi import APIRouter, Request, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from datetime import datetime, timezone # Added timezone
from typing import List, Optional, Dict, Any # Added Dict, Any
# Removed UUID import as user_id is likely a string
from ..utils.mongo import get_orders_collection, serialize_mongo_doc # Use specific collection getter and serializer
from ..models.models import Order, OrderCreate, OrderUpdate, OrderItem # Import Order models
from ..utils.dependencies import get_current_active_user # Import authentication dependency
from pymongo.collection import Collection
from app.utils.logging_config import get_module_logger

logger = get_module_logger(__name__)

router = APIRouter(prefix="/orders", tags=["Orders"]) # Add prefix and tag

# TODO: Implement webhook security (signature verification)
# TODO: Implement robust user mapping (how to link webhook to user_id?)
@router.post("/webhooks/shoptet", status_code=status.HTTP_202_ACCEPTED, summary="Shoptet Webhook Receiver")
async def shoptet_webhook(
    request: Request,
    orders_collection: Collection = Depends(get_orders_collection)
):
    """Handles incoming order webhooks from Shoptet."""
    try:
        payload = await request.json()
        logger.info(f"Received Shoptet webhook payload: {payload}")

        # --- Placeholder for User ID mapping ---
        # This is CRITICAL. How do we know which user this webhook belongs to?
        # Option 1: Pass user_id in webhook URL (less secure)
        # Option 2: Have a mapping table (shop_id -> user_id)
        # Option 3: Use a unique identifier from payload if available
        # For now, we'll assume a user_id is somehow provided or mapped.
        # Replace this placeholder logic:
        user_id = payload.get("eshopId") or payload.get("user_identifier") # Example placeholder
        if not user_id:
             logger.error("Webhook payload missing user identifier (e.g., eshopId)")
             # Return 202 Accepted anyway so Shoptet doesn't retry indefinitely,
             # but log the error for investigation.
             return {"message": "Accepted but missing user identifier"}
             # Alternatively, raise HTTPException(status_code=400, detail="Missing user identifier")

        # --- Extract Order Data (adjust keys based on actual Shoptet payload) ---
        platform_order_id = payload.get("code") # Example: Shoptet might use 'code'
        if not platform_order_id:
            logger.error("Webhook payload missing order identifier (e.g., code)")
            return {"message": "Accepted but missing order identifier"}

        # Map payload fields to our OrderCreate model structure
        # This requires knowing the actual Shoptet webhook structure
        order_create_data = {
            "user_id": str(user_id), # Ensure user_id is string
            "source_platform": "shoptet",
            "platform_order_id": str(platform_order_id),
            "status": payload.get("statusName", "Unknown"), # Example mapping
            "items": [], # TODO: Parse items from payload
            "total_amount": float(payload.get("totalPriceWithVat", 0.0)), # Example mapping
            "currency": payload.get("currencyCode", "CZK"), # Example mapping
            "customer_email": payload.get("email"), # Example mapping
            "customer_name": payload.get("billingAddress", {}).get("fullName"), # Example mapping
            "tracking_number": payload.get("trackingNumber"), # Example mapping
            "order_date": payload.get("creationTime"), # Example mapping (needs parsing)
            "raw_webhook_data": payload # Store raw data for now
        }

        # TODO: Parse items, addresses, dates correctly from Shoptet payload

        # Validate data using OrderCreate model before saving
        try:
            order_to_save = OrderCreate(**order_create_data).model_dump(exclude_unset=True)
        except Exception as pydantic_error:
             logger.error(f"Pydantic validation failed for webhook data: {pydantic_error}")
             logger.error(f"Data causing validation error: {order_create_data}")
             # Return 202 Accepted but log the validation error
             return {"message": "Accepted but validation failed"}

        # Upsert order based on user_id + platform_order_id
        await orders_collection.update_one(
            {"user_id": order_to_save["user_id"], "platform_order_id": order_to_save["platform_order_id"]},
            {
                "$set": {**order_to_save, "updated_at": datetime.now(timezone.utc)},
                "$setOnInsert": {"created_at": datetime.now(timezone.utc)}
            },
            upsert=True,
        )
        logger.info(f"Upserted order {platform_order_id} for user {user_id} from Shoptet webhook.")
        return {"message": "Order webhook processed successfully"}

    except json.JSONDecodeError:
        logger.error("Failed to decode JSON from Shoptet webhook request body.")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except Exception as e:
        logger.error(f"Error processing Shoptet webhook: {e}", exc_info=True)
        # Return 202 Accepted even on internal errors to prevent excessive retries from Shoptet
        return {"message": "Accepted but internal server error occurred"}


@router.get("/", response_model=List[Order], summary="List User Orders")
async def list_orders(
    current_user: Dict[str, Any] = Depends(get_current_active_user), # Use auth dependency
    orders_collection: Collection = Depends(get_orders_collection)
):
    """Retrieves a list of orders for the currently authenticated user."""
    user_id = current_user["id"] # Get user ID from authenticated user dict
    logger.info(f"Fetching orders for user_id: {user_id}")
    orders_cursor = orders_collection.find({"user_id": user_id}).sort("order_date", -1) # Sort by date descending
    orders = await orders_cursor.to_list(length=100) # Limit length for safety
    # Use serialize_mongo_doc for proper ObjectId/datetime handling
    return [serialize_mongo_doc(order) for order in orders]


@router.get("/{platform_order_id}", response_model=Order, summary="Get Specific Order")
async def get_order(
    platform_order_id: str,
    current_user: Dict[str, Any] = Depends(get_current_active_user), # Use auth dependency
    orders_collection: Collection = Depends(get_orders_collection)
):
    """Retrieves a specific order by its platform ID for the authenticated user."""
    user_id = current_user["id"] # Get user ID from authenticated user dict
    logger.info(f"Fetching order platform_id: {platform_order_id} for user_id: {user_id}")
    order = await orders_collection.find_one({
        "user_id": user_id,
        "platform_order_id": platform_order_id
    })
    if not order:
        logger.warning(f"Order {platform_order_id} not found for user {user_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    # Use serialize_mongo_doc for proper ObjectId/datetime handling
    return serialize_mongo_doc(order)
