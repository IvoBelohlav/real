import os
import stripe
from fastapi import HTTPException
from app.utils.logging_config import get_module_logger
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

logger = get_module_logger(__name__)

# Initialize Stripe with the API key from environment variables
STRIPE_API_KEY = os.getenv("STRIPE_API_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
DASHBOARD_URL = os.getenv("DASHBOARD_URL", "http://localhost:3000")

if not STRIPE_API_KEY:
    logger.warning("STRIPE_API_KEY not set. Stripe functionality will not work.")

stripe.api_key = STRIPE_API_KEY

# Define price IDs for different subscription tiers
SUBSCRIPTION_PRICES = {
    "basic": os.getenv("STRIPE_BASIC_PRICE_ID"),
    "premium": os.getenv("STRIPE_PREMIUM_PRICE_ID"),
    "enterprise": os.getenv("STRIPE_ENTERPRISE_PRICE_ID"),
}

async def create_customer(email: str, name: str = None) -> Dict[str, Any]:
    """
    Create a new customer in Stripe.
    """
    try:
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={
                "source": "lermo_widget_platform"
            }
        )
        logger.info(f"Created Stripe customer: {customer.id} for {email}")
        return customer
    except stripe.error.StripeError as e:
        logger.error(f"Error creating Stripe customer: {e}")
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")

async def create_checkout_session(
    customer_id: str, 
    price_id: str, 
    user_id: str,
    success_url: Optional[str] = None, 
    cancel_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a Stripe Checkout session for subscription.
    """
    if not success_url:
        success_url = f"{DASHBOARD_URL}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    if not cancel_url:
        cancel_url = f"{DASHBOARD_URL}/subscription/cancel"
        
    try:
        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=user_id,
            metadata={
                "user_id": user_id
            }
        )
        logger.info(f"Created checkout session: {checkout_session.id} for customer {customer_id}")
        return checkout_session
    except stripe.error.StripeError as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")

async def get_subscription(subscription_id: str) -> Dict[str, Any]:
    """
    Get subscription details from Stripe.
    """
    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        logger.debug(f"Retrieved subscription: {subscription.id}")
        return subscription
    except stripe.error.StripeError as e:
        logger.error(f"Error retrieving subscription: {e}")
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")

async def cancel_subscription(subscription_id: str) -> Dict[str, Any]:
    """
    Cancel a subscription in Stripe.
    """
    try:
        canceled_subscription = stripe.Subscription.delete(subscription_id)
        logger.info(f"Canceled subscription: {subscription_id}")
        return canceled_subscription
    except stripe.error.StripeError as e:
        logger.error(f"Error canceling subscription: {e}")
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")

async def create_portal_session(customer_id: str, return_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a billing portal session for a customer.
    """
    if not return_url:
        return_url = f"{DASHBOARD_URL}/dashboard"
        
    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        logger.debug(f"Created portal session for customer: {customer_id}")
        return portal_session
    except stripe.error.StripeError as e:
        logger.error(f"Error creating portal session: {e}")
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")

def construct_event(payload: str, sig_header: str) -> stripe.Event:
    """
    Construct a Stripe event from webhook payload and signature.
    """
    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=STRIPE_WEBHOOK_SECRET
        )
        logger.debug(f"Constructed webhook event type: {event.type}")
        return event
    except ValueError as e:
        logger.error("Invalid payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

def get_subscription_price_id(tier: str) -> str:
    """
    Get the Stripe price ID for a subscription tier.
    """
    price_id = SUBSCRIPTION_PRICES.get(tier.lower())
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Invalid subscription tier: {tier}")
    return price_id 