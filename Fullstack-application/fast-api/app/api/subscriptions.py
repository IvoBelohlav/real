from fastapi import APIRouter, Depends, HTTPException, Header, Request, status, Body
from app.models.subscription import (
    CreateCheckoutSessionRequest, 
    CreateCheckoutSessionResponse,
    SubscriptionDetails,
    CustomerPortalRequest,
    CustomerPortalResponse,
    EmbedSnippet,
    ApiKeyResponse
)
from app.utils.dependencies import get_current_user, generate_api_key
from app.utils.stripe_utils import (
    create_checkout_session,
    get_subscription,
    create_portal_session,
    create_customer,
    get_subscription_price_id,
    construct_event
)
from datetime import datetime, timezone
from app.utils.mongo import get_user_collection, serialize_mongo_doc
from app.utils.logging_config import get_module_logger
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import json
import os
from app.models.user import SubscriptionTier, SubscriptionStatus

logger = get_module_logger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

@router.post("/create-checkout-session", response_model=CreateCheckoutSessionResponse)
async def create_new_checkout_session(
    request: CreateCheckoutSessionRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Create a checkout session for a new subscription.
    """
    user_id = current_user.get("id")
    email = current_user.get("email")
    username = current_user.get("username")
    
    # Check if user already has a customer ID
    stripe_customer_id = current_user.get("stripe_customer_id")
    
    # If no Stripe customer ID exists, create a new one
    if not stripe_customer_id:
        customer = await create_customer(email=email, name=username)
        stripe_customer_id = customer.id
        
        # Update user with Stripe customer ID
        user_collection = await get_user_collection()
        await user_collection.update_one(
            {"id": user_id},
            {"$set": {"stripe_customer_id": stripe_customer_id}}
        )
    
    # Get price ID based on the subscription tier
    price_id = get_subscription_price_id(request.tier)
    
    # Create checkout session
    checkout_session = await create_checkout_session(
        customer_id=stripe_customer_id,
        price_id=price_id,
        user_id=user_id,
        success_url=request.success_url,
        cancel_url=request.cancel_url
    )
    
    return CreateCheckoutSessionResponse(
        checkout_url=checkout_session.url,
        session_id=checkout_session.id
    )

@router.get("/current", response_model=SubscriptionDetails)
async def get_current_subscription(current_user: Dict = Depends(get_current_user)):
    """
    Get the current subscription details for the user.
    """
    subscription_id = current_user.get("stripe_subscription_id")
    
    if not subscription_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found"
        )
    
    subscription = await get_subscription(subscription_id)
    
    # Determine tier from the subscription
    items = subscription.get("items", {}).get("data", [])
    price_id = items[0].get("price", {}).get("id") if items else None
    
    # Map price ID to tier (this is a simplification - in a real app you might store tier mapping in the DB)
    tiers = {
        os.getenv("STRIPE_BASIC_PRICE_ID"): SubscriptionTier.BASIC,
        os.getenv("STRIPE_PREMIUM_PRICE_ID"): SubscriptionTier.PREMIUM,
        os.getenv("STRIPE_ENTERPRISE_PRICE_ID"): SubscriptionTier.ENTERPRISE
    }
    
    tier = tiers.get(price_id, SubscriptionTier.FREE)
    
    return SubscriptionDetails(
        id=subscription.id,
        customer_id=subscription.customer,
        status=subscription.status,
        current_period_end=datetime.fromtimestamp(subscription.current_period_end, tz=timezone.utc),
        tier=tier,
        cancel_at_period_end=subscription.cancel_at_period_end,
        created_at=datetime.fromtimestamp(subscription.created, tz=timezone.utc),
        payment_method=subscription.default_payment_method
    )

@router.post("/portal", response_model=CustomerPortalResponse)
async def create_customer_portal(
    request: CustomerPortalRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Create a Stripe customer portal session for managing subscriptions.
    """
    stripe_customer_id = current_user.get("stripe_customer_id")
    
    if not stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Stripe customer found"
        )
    
    portal_session = await create_portal_session(
        customer_id=stripe_customer_id,
        return_url=request.return_url
    )
    
    return CustomerPortalResponse(portal_url=portal_session.url)

@router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None)
):
    """
    Handle Stripe webhook events.
    """
    if not stripe_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stripe signature missing"
        )
    
    # Get the request body
    payload = await request.body()
    payload_str = payload.decode("utf-8")
    
    # Construct and validate the event
    event = construct_event(payload_str, stripe_signature)
    
    # Handle different event types
    event_type = event.type
    event_data = event.data.object
    
    user_collection = await get_user_collection()
    
    if event_type == "checkout.session.completed":
        # Customer completed the checkout process
        user_id = event_data.get("client_reference_id") or event_data.get("metadata", {}).get("user_id")
        
        if not user_id:
            logger.error("No user ID found in checkout session event")
            return {"status": "error", "message": "No user ID found"}
        
        subscription_id = event_data.get("subscription")
        
        if subscription_id:
            # Update user with subscription ID
            await user_collection.update_one(
                {"id": user_id},
                {"$set": {
                    "stripe_subscription_id": subscription_id,
                    "subscription_status": SubscriptionStatus.ACTIVE,
                }}
            )
            logger.info(f"Updated user {user_id} with subscription {subscription_id}")
    
    elif event_type == "customer.subscription.updated":
        # Subscription was updated
        subscription_id = event_data.get("id")
        customer_id = event_data.get("customer")
        
        if not subscription_id or not customer_id:
            logger.error("Missing subscription or customer ID in event")
            return {"status": "error", "message": "Missing subscription or customer ID"}
        
        status = event_data.get("status")
        current_period_end = datetime.fromtimestamp(event_data.get("current_period_end", 0), tz=timezone.utc)
        
        # Update user with new subscription status
        await user_collection.update_one(
            {"stripe_customer_id": customer_id},
            {"$set": {
                "subscription_status": status,
                "subscription_end_date": current_period_end
            }}
        )
        logger.info(f"Updated subscription status to {status} for customer {customer_id}")
    
    elif event_type == "customer.subscription.deleted":
        # Subscription was canceled or expired
        subscription_id = event_data.get("id")
        customer_id = event_data.get("customer")
        
        if not subscription_id or not customer_id:
            logger.error("Missing subscription or customer ID in event")
            return {"status": "error", "message": "Missing subscription or customer ID"}
        
        # Update user - subscription is now inactive
        await user_collection.update_one(
            {"stripe_customer_id": customer_id},
            {"$set": {
                "subscription_status": SubscriptionStatus.INACTIVE,
                "subscription_tier": SubscriptionTier.FREE
            }}
        )
        logger.info(f"Marked subscription {subscription_id} as inactive for customer {customer_id}")
    
    return {"status": "success"}

@router.get("/embed-snippet", response_model=EmbedSnippet)
async def get_embed_snippet(current_user: Dict = Depends(get_current_user)):
    """
    Get the embed snippet for the widget.
    """
    user_id = current_user.get("id")
    api_key = current_user.get("api_key")
    
    # If user doesn't have an API key, generate one
    if not api_key:
        api_key = generate_api_key()
        
        # Update user with API key
        user_collection = await get_user_collection()
        await user_collection.update_one(
            {"id": user_id},
            {"$set": {"api_key": api_key}}
        )
    
    # API endpoint with HTTPS
    api_url = "https://lermobackend.up.railway.app"
    
    # Generate embed snippet
    html = f"""<!-- Lermo Widget Container -->
<div id="lermo-widget-container"></div>"""
    
    javascript = f"""<!-- Lermo Widget Script -->
<script src="https://widget.lermo.ai/index.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {{
    window.LermoWidget.init({{
      apiKey: "{api_key}",
      apiUrl: "{api_url}",
      containerId: "lermo-widget-container"
    }});
  }});
</script>"""
    
    instructions = """
1. Add the HTML code in your website where you want the widget to appear
2. Place the JavaScript code just before the closing </body> tag
3. The widget will automatically load when your page loads
4. Your API key is embedded in the script and will authenticate your requests
"""
    
    return EmbedSnippet(
        html=html,
        javascript=javascript,
        instructions=instructions
    )

@router.post("/api-key", response_model=ApiKeyResponse)
async def regenerate_api_key(current_user: Dict = Depends(get_current_user)):
    """
    Regenerate API key for the user.
    """
    user_id = current_user.get("id")
    
    # Generate new API key
    new_api_key = generate_api_key()
    
    # Update user with new API key
    user_collection = await get_user_collection()
    await user_collection.update_one(
        {"id": user_id},
        {"$set": {"api_key": new_api_key}}
    )
    
    return ApiKeyResponse(api_key=new_api_key) 