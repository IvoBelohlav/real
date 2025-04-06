import stripe
import os
from typing import Dict, Optional, List # Added List
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, Field
from starlette.responses import JSONResponse
from datetime import datetime # Added datetime
from app.utils.mongo import get_user_collection
from app.models.user import User
import uuid
import logging
from dotenv import load_dotenv
from app.utils.dependencies import get_current_active_customer, get_current_user
from app.utils.stripe_utils import construct_event, handle_webhook_event # Added import for webhook handlers
from fastapi import status

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
    background_tasks: BackgroundTasks,
    current_user: Optional[Dict] = Depends(get_current_user)
):
    try:
        # Ensure user is authenticated
        if not current_user:
            logger.error("Unauthenticated request to create checkout session")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to create checkout session"
            )
            
        # Ensure Stripe API key is set
        if not stripe.api_key:
            # Try to load it again
            stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
            if not stripe.api_key:
                logger.error("Stripe API key still not available")
                raise HTTPException(status_code=500, detail="Stripe API key not configured on server")
        
        # Get user ID from the authenticated user
        user_id = current_user["id"]
        logger.info(f"Creating checkout session for user {user_id}")
        
        # If the price ID provided doesn't exist, try to use our test price
        price_id = request.price_id
        try:
            # Verify the price exists
            stripe.Price.retrieve(price_id)
            logger.info(f"Using price ID: {price_id}")
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
            success_url=SUCCESS_URL.replace("{USER_ID}", user_id),
            cancel_url=CANCEL_URL,
            client_reference_id=user_id,
        )
        
        logger.info(f"Checkout session created: {checkout_session.id} for user {user_id}")
        return {"checkout_url": checkout_session.url, "session_id": checkout_session.id}
        
    except HTTPException:
        # Re-raise HTTP exceptions as they already have the right status code
        raise
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/widget-snippet", response_model=WidgetSnippetResponse)
async def get_widget_snippet(current_user: Dict = Depends(get_current_active_customer)):
    try:
        # Get user_id from current_user
        user_id = current_user["id"]
        
        # User is already authenticated via the dependency, no need to check if user exists
        # Check if user already has an API key
        api_key = current_user.get("api_key")
        
        # Generate a unique API key if the user doesn't have one
        if not api_key:
            api_key = f"test_api_{uuid.uuid4().hex}"
            user_collection = await get_user_collection()
            await user_collection.update_one(
                {"id": user_id},
                {"$set": {"api_key": api_key}}
            )
        
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
    """
    Webhook endpoint for Stripe events.
    Uses the centralized handler from stripe_utils.py.
    """
    # Get the webhook signature from request headers
    signature = request.headers.get("stripe-signature")
    
    if not signature or not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=400, detail="Missing signature or webhook secret")
    
    # Get request body
    payload = await request.body()
    
    try:
        # Verify and construct the event using the utility function
        event = await construct_event(
            payload=payload,
            sig_header=signature,
            secret=STRIPE_WEBHOOK_SECRET
        )

        # Get user collection for database operations
        user_collection = await get_user_collection()

        # Use centralized webhook handler from stripe_utils
        result = await handle_webhook_event(event, user_collection)

        # Return the result from the handler
        logger.info(f"Webhook event {event.type} processed with result: {result}")
        return JSONResponse(content=result, status_code=200)

    except HTTPException as http_exc:
        # Re-raise HTTP exceptions from construct_event or handle_webhook_event
        logger.error(f"HTTP exception during webhook processing: {http_exc.detail}")
        raise http_exc
    except Exception as e:
        # Catch any other unexpected errors during processing
        logger.error(f"Unexpected error processing webhook {event.id if 'event' in locals() else 'unknown'}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error during webhook processing")

@router.get("/payments/stripe-status")
async def check_stripe_status():
    """
    Check if Stripe is configured properly on the server.
    Frontend uses this to determine whether to show Stripe-related features.
    """
    try:
        if not STRIPE_SECRET_KEY:
            return {
                "status": "error",
                "message": "Stripe API key not configured on server",
                "configured": False
            }
        
        # Test Stripe API key by making a simple request
        stripe.Account.retrieve()
        
        return {
            "status": "success",
            "message": "Stripe is configured properly",
            "configured": True
        }
    except stripe.error.AuthenticationError:
        return {
            "status": "error",
            "message": "Invalid Stripe API key",
            "configured": False
        }
    except Exception as e:
        logger.error(f"Error checking Stripe status: {str(e)}")
        return {
            "status": "error",
            "message": f"Stripe configuration error: {str(e)}",
            "configured": False
        }

# --- Invoice Models ---
class InvoiceItem(BaseModel):
    id: str
    created: datetime
    amount_due: float
    currency: str
    status: str
    invoice_pdf: Optional[str] = None # URL to download the invoice PDF
    hosted_invoice_url: Optional[str] = None # URL to view the invoice online

class InvoiceListResponse(BaseModel):
    invoices: List[InvoiceItem]

# --- Invoice Endpoint ---
@router.get("/payments/invoices", response_model=InvoiceListResponse)
async def list_invoices(
    current_user: Dict = Depends(get_current_user) # Use JWT authentication
):
    """
    Retrieves a list of invoices for the authenticated user from Stripe.
    """
    if not stripe.api_key:
        logger.error("Stripe API key not configured for listing invoices.")
        raise HTTPException(status_code=500, detail="Stripe API key not configured on server")

    stripe_customer_id = current_user.get("stripe_customer_id")

    if not stripe_customer_id:
        logger.info(f"User {current_user.get('id')} has no Stripe customer ID. Returning empty invoice list.")
        # It's not an error if the user hasn't subscribed yet
        return {"invoices": []}

    try:
        logger.info(f"Fetching invoices for Stripe customer ID: {stripe_customer_id}")
        # List invoices for the customer
        stripe_invoices = stripe.Invoice.list(customer=stripe_customer_id, limit=100) # Adjust limit as needed

        invoices_data = []
        for inv in stripe_invoices.data:
            invoices_data.append(
                InvoiceItem(
                    id=inv.id,
                    created=datetime.fromtimestamp(inv.created), # Convert timestamp to datetime
                    amount_due=inv.amount_due / 100.0, # Convert cents to dollars/euros etc.
                    currency=inv.currency,
                    status=inv.status,
                    invoice_pdf=inv.invoice_pdf,
                    hosted_invoice_url=inv.hosted_invoice_url
                )
            )

        logger.info(f"Found {len(invoices_data)} invoices for customer {stripe_customer_id}")
        return {"invoices": invoices_data}

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error fetching invoices for customer {stripe_customer_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Could not retrieve invoices: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error fetching invoices for customer {stripe_customer_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching invoices.")
