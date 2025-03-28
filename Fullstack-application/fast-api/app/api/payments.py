import stripe
import os
from typing import Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, Field
from starlette.responses import JSONResponse
from app.utils.mongo import get_user_collection
from app.models.user import User
import uuid
import logging
from dotenv import load_dotenv

# Reload environment variables to ensure we get the latest values
load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter()

# Get Stripe API key from environment
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# Debug log the key (partially masked)
if STRIPE_SECRET_KEY:
    masked_key = STRIPE_SECRET_KEY[:7] + "*" * 10 + STRIPE_SECRET_KEY[-4:]
    logger.info(f"Loaded Stripe API key: {masked_key}")
else:
    logger.error("STRIPE_SECRET_KEY not found in environment variables!")

# Set up Stripe with the API key
stripe.api_key = STRIPE_SECRET_KEY

# Test price ID for our subscription
TEST_PRICE_ID = None

# Create a product and price in Stripe if they don't already exist
def ensure_test_price_exists():
    global TEST_PRICE_ID
    
    if not stripe.api_key:
        logger.error("Cannot create test price: Stripe API key not set")
        return None
    
    try:
        # Check if we already have a cached price ID
        if TEST_PRICE_ID:
            # Verify it exists
            try:
                stripe.Price.retrieve(TEST_PRICE_ID)
                logger.info(f"Using existing price: {TEST_PRICE_ID}")
                return TEST_PRICE_ID
            except stripe.error.StripeError:
                # Price doesn't exist, create a new one
                logger.info(f"Cached price {TEST_PRICE_ID} not found, creating new one")
                TEST_PRICE_ID = None
        
        # Look for existing products named "Lermo AI Widget Subscription"
        products = stripe.Product.list(limit=10)
        test_product = None
        
        for product in products.data:
            if product.name == "Lermo AI Widget Subscription":
                test_product = product
                break
        
        # Create the product if it doesn't exist
        if not test_product:
            logger.info("Creating test product in Stripe")
            test_product = stripe.Product.create(
                name="Lermo AI Widget Subscription",
                description="Test subscription for Lermo AI Widget"
            )
        
        # Look for existing prices for this product
        prices = stripe.Price.list(product=test_product.id, limit=1)
        
        if prices.data:
            TEST_PRICE_ID = prices.data[0].id
            logger.info(f"Using existing price: {TEST_PRICE_ID}")
        else:
            # Create a new price
            logger.info("Creating test price in Stripe")
            price = stripe.Price.create(
                product=test_product.id,
                unit_amount=1999,  # $19.99
                currency="usd",
                recurring={"interval": "month"}
            )
            TEST_PRICE_ID = price.id
            logger.info(f"Created new price: {TEST_PRICE_ID}")
        
        return TEST_PRICE_ID
            
    except stripe.error.StripeError as e:
        logger.error(f"Error creating test price: {str(e)}")
        return None

# Your frontend success and cancel URLs
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
SUCCESS_URL = f"{FRONTEND_URL}/subscription-test?stripe_checkout=success&user_id={{USER_ID}}"
CANCEL_URL = f"{FRONTEND_URL}/subscription-test?stripe_checkout=cancelled"

class CheckoutSessionRequest(BaseModel):
    price_id: str = Field(..., description="Stripe Price ID for the subscription")
    user_id: str = Field(..., description="Test User ID for this checkout session")

class CheckoutSessionResponse(BaseModel):
    checkout_url: str = Field(..., description="URL to redirect the user to Stripe Checkout")

class WidgetSnippetRequest(BaseModel):
    user_id: str = Field(..., description="User ID to generate snippet for")

class WidgetSnippetResponse(BaseModel):
    snippet: Optional[str] = Field(None, description="HTML snippet to embed the widget")
    status: str = Field("success", description="Status of the snippet generation")

@router.post("/payments/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: CheckoutSessionRequest,
    background_tasks: BackgroundTasks
):
    try:
        # Ensure Stripe API key is set
        if not stripe.api_key:
            # Try to load it again
            stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
            if not stripe.api_key:
                logger.error("Stripe API key still not available")
                raise HTTPException(status_code=500, detail="Stripe API key not configured on server")
        
        # For testing purposes, we'll generate a basic user record
        user_collection = await get_user_collection()
        
        # Check if user exists by ID
        existing_user = await user_collection.find_one({"id": request.user_id})
        
        if not existing_user:
            # Create a test user if it doesn't exist
            user = {
                "id": request.user_id,
                "email": f"test_{request.user_id}@example.com",
                "subscription_status": "pending"
            }
            await user_collection.insert_one(user)
        
        # If the price ID provided doesn't exist, try to use our test price
        price_id = request.price_id
        try:
            # Verify the price exists
            stripe.Price.retrieve(price_id)
        except stripe.error.StripeError:
            # Price doesn't exist, use our test price
            logger.warning(f"Price ID {price_id} not found in Stripe, using test price")
            price_id = ensure_test_price_exists()
            
            if not price_id:
                raise HTTPException(
                    status_code=400, 
                    detail="Invalid price ID and could not create test price. Please check your Stripe configuration."
                )
        
        # Create Stripe checkout session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            mode="subscription",
            success_url=SUCCESS_URL.replace("{USER_ID}", request.user_id),
            cancel_url=CANCEL_URL,
            client_reference_id=request.user_id,
        )
        
        return {"checkout_url": checkout_session.url}
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/widget-snippet", response_model=WidgetSnippetResponse)
async def get_widget_snippet(user_id: str):
    try:
        # Check if user has an active subscription
        user_collection = await get_user_collection()
        user = await user_collection.find_one({"id": user_id})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # In a real implementation, we would check if user.subscription_status == "active"
        # For test purposes, we'll generate a snippet regardless
        
        # Generate a unique API key if the user doesn't have one
        if not user.get("api_key"):
            api_key = f"test_api_{uuid.uuid4().hex}"
            await user_collection.update_one(
                {"id": user_id},
                {"$set": {"api_key": api_key}}
            )
        else:
            api_key = user["api_key"]
        
        # Generate the widget snippet with the API key
        snippet = f"""<!-- Lermo AI Widget -->
<script src="http://localhost:5173/widget.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {{
    LermoWidget.init({{
      apiKey: '{api_key}',
      container: '#lermo-widget-container',
      theme: 'light',
      position: 'bottom-right'
    }});
  }});
</script>
<div id="lermo-widget-container"></div>
<!-- End Lermo AI Widget -->"""
        
        return {"snippet": snippet, "status": "success"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating widget snippet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    # Get the webhook signature from request headers
    signature = request.headers.get("stripe-signature")
    
    if not signature or not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=400, detail="Missing signature or webhook secret")
    
    # Get request body
    payload = await request.body()
    
    try:
        # Verify the event with Stripe
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=signature,
            secret=STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("client_reference_id")
        
        if user_id:
            # Get subscription ID from session
            subscription_id = session.get("subscription")
            customer_id = session.get("customer")
            
            if subscription_id and customer_id:
                # Update user in the database
                user_collection = await get_user_collection()
                await user_collection.update_one(
                    {"id": user_id},
                    {
                        "$set": {
                            "stripe_customer_id": customer_id,
                            "stripe_subscription_id": subscription_id,
                            "subscription_status": "active"
                        }
                    }
                )
    
    # Handle other subscription events
    elif event["type"] in ["customer.subscription.updated", "customer.subscription.deleted"]:
        subscription = event["data"]["object"]
        customer_id = subscription.get("customer")
        status = subscription.get("status")
        
        if customer_id and status:
            # Update user subscription status
            user_collection = await get_user_collection()
            await user_collection.update_one(
                {"stripe_customer_id": customer_id},
                {"$set": {"subscription_status": status}}
            )
    
    return JSONResponse({"status": "success"}) 