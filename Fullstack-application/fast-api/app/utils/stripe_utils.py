import os
import stripe
from fastapi import HTTPException, Request
from app.utils.logging_config import get_module_logger
from typing import Dict, Any, Optional, Tuple
from dotenv import load_dotenv
from datetime import datetime, timezone
from app.utils.mongo import get_user_collection # Added for DB access
from app.models.user import SubscriptionStatus, SubscriptionTier # Import SubscriptionTier as well

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

# Map Price IDs back to SubscriptionTier enum values
# Ensure the environment variables match the actual Price IDs in your Stripe account
PRICE_ID_TO_TIER: Dict[str, SubscriptionTier] = {
    price_id: tier
    for tier_name, price_id in SUBSCRIPTION_PRICES.items()
    if price_id and hasattr(SubscriptionTier, tier_name.upper())
    for tier in [SubscriptionTier[tier_name.upper()]] # Get enum member
}
# Add free tier mapping if needed, assuming no specific price ID for free
# PRICE_ID_TO_TIER[None] = SubscriptionTier.FREE # Or handle None plan_id explicitly later

logger.info(f"Stripe Price ID to Tier mapping: {PRICE_ID_TO_TIER}")


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
                "user_id": user_id  # Use snake_case consistently
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

# --- Start Re-implemented Webhook Handling ---

async def construct_event(payload: bytes, sig_header: str, secret: str) -> stripe.Event:
    """
    Verify and construct the Stripe event.
    """
    if not secret:
        logger.error("Stripe webhook secret is not configured.")
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    try:
        event = stripe.Webhook.construct_event(
            payload=payload, sig_header=sig_header, secret=secret
        )
        logger.info(f"Received Stripe event: {event.type} (ID: {event.id})")
        return event
    except ValueError as e:
        # Invalid payload
        logger.error(f"Invalid webhook payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        logger.error(f"Invalid webhook signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        logger.error(f"Error constructing webhook event: {e}")
        raise HTTPException(status_code=500, detail="Error processing webhook")


async def handle_checkout_session_completed(event: stripe.Event, user_collection):
    """
    Handle the 'checkout.session.completed' event.
    Updates user with Stripe customer ID, subscription ID, and initial status.
    """
    session = event.data.object
    user_id = session.get("client_reference_id")
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")
    status = session.get("status") # Should be 'complete'
    payment_status = session.get("payment_status") # Should be 'paid'

    if not user_id:
        logger.error(f"Missing 'client_reference_id' in checkout session {session.id}")
        return {"status": "error", "message": "Missing user ID"}

    if status == "complete" and payment_status == "paid":
        logger.info(f"Checkout session {session.id} completed for user {user_id}.")
        
        # Retrieve the full subscription object to get details like status and period end
        try:
            subscription = await get_subscription(subscription_id)
            sub_status = subscription.status # e.g., 'active', 'trialing'
            current_period_end_ts = subscription.current_period_end
            current_period_end_dt = datetime.fromtimestamp(current_period_end_ts, tz=timezone.utc) if current_period_end_ts else None
            plan_id = subscription.plan.id if subscription.plan else None
            
            # Map Stripe status to internal enum
            internal_status = SubscriptionStatus.INACTIVE # Default
            if sub_status in ["active", "trialing"]:
                 internal_status = SubscriptionStatus.ACTIVE if sub_status == "active" else SubscriptionStatus.TRIALING
            elif sub_status in ["past_due", "unpaid"]:
                 internal_status = SubscriptionStatus.PAST_DUE
            elif sub_status == "canceled":
                 internal_status = SubscriptionStatus.CANCELED

            # --- Map plan_id to internal SubscriptionTier ---
            # Default to FREE if plan_id is None or not found in our mapping
            subscription_tier_enum = PRICE_ID_TO_TIER.get(plan_id, SubscriptionTier.FREE)
            logger.info(f"[Webhook Checkout Completed] Stripe Plan ID: '{plan_id}', Mapped Tier: '{subscription_tier_enum.value}' for User: {user_id}") # Detailed Log
            # --- End Tier Mapping ---

            # Ensure plan_id is fetched correctly before this block
            plan_id = subscription.plan.id if subscription.plan else None
            logger.info(f"Webhook: plan_id determined as: {plan_id}") # Add logging

            update_data = {
                "stripe_customer_id": customer_id,
                "stripe_subscription_id": subscription_id,
                "subscription_status": internal_status.value,
                "subscription_tier": subscription_tier_enum.value, # Store the mapped tier name
                "subscription_current_period_end": current_period_end_dt,
                "updated_at": datetime.now(timezone.utc)
            }
            logger.info(f"Webhook: update_data prepared: {update_data}") # Add logging
            
            result = await user_collection.update_one(
                {"id": user_id},
                {"$set": update_data}
            )

            if result.matched_count == 0:
                logger.error(f"User {user_id} not found in DB for checkout session {session.id}")
                return {"status": "error", "message": "User not found"}
            elif result.modified_count == 0:
                 logger.warning(f"User {user_id} subscription data not modified for checkout session {session.id} (maybe already up-to-date).")
            else:
                logger.info(f"Successfully updated user {user_id} with subscription details from checkout {session.id}.")
            
            return {"status": "success"}

        except Exception as e:
             logger.error(f"Error updating user {user_id} after checkout {session.id}: {e}")
             return {"status": "error", "message": f"DB update failed: {e}"}
            
    else:
        logger.warning(f"Checkout session {session.id} for user {user_id} not 'complete' or 'paid'. Status: {status}, Payment Status: {payment_status}")
        return {"status": "ignored", "message": "Session not complete/paid"}


async def handle_customer_subscription_updated(event: stripe.Event, user_collection):
    """
    Handle 'customer.subscription.updated' events.
    Updates subscription status, tier, and period end in the database.
    """
    subscription = event.data.object
    subscription_id = subscription.id
    customer_id = subscription.customer
    status = subscription.status # e.g., active, past_due, unpaid, canceled, trialing
    current_period_end_ts = subscription.current_period_end
    current_period_end_dt = datetime.fromtimestamp(current_period_end_ts, tz=timezone.utc) if current_period_end_ts else None
    plan_id = subscription.plan.id if subscription.plan else None
    cancel_at_period_end = subscription.cancel_at_period_end

    logger.info(f"Handling subscription update for {subscription_id}. Status: {status}, Cancel at period end: {cancel_at_period_end}")

    # Map Stripe status to internal enum
    internal_status = SubscriptionStatus.INACTIVE # Default
    if status in ["active", "trialing"]:
         internal_status = SubscriptionStatus.ACTIVE if status == "active" else SubscriptionStatus.TRIALING
    elif status in ["past_due", "unpaid"]:
         internal_status = SubscriptionStatus.PAST_DUE
    elif status == "canceled":
         internal_status = SubscriptionStatus.CANCELED

    # If canceled at period end, keep status active until the period ends, but note it.
    # The actual 'canceled' status comes via customer.subscription.deleted or when period ends.
    # We might need a separate field for `cancel_at_period_end` if precise state is needed.
    # For now, we just update based on the main `status`.

    # --- Map plan_id to internal SubscriptionTier ---
    # Default to FREE if plan_id is None or not found in our mapping
    subscription_tier_enum = PRICE_ID_TO_TIER.get(plan_id, SubscriptionTier.FREE)
    logger.info(f"[Webhook Sub Updated] Stripe Plan ID: '{plan_id}', Mapped Tier: '{subscription_tier_enum.value}' for Sub: {subscription_id}") # Detailed Log
    # --- End Tier Mapping ---

    update_data = {
        "subscription_status": internal_status.value,
        "subscription_tier": subscription_tier_enum.value, # Store the mapped tier name
        "subscription_current_period_end": current_period_end_dt,
        "updated_at": datetime.now(timezone.utc)
    }

    try:
        # Find user by subscription ID (or customer ID if needed, though less direct)
        result = await user_collection.update_one(
            {"stripe_subscription_id": subscription_id},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            logger.warning(f"No user found with subscription ID {subscription_id} for update event.")
            # Optionally, try finding by customer ID if necessary, though less reliable if multiple subs exist
            # user = await user_collection.find_one({"stripe_customer_id": customer_id}) ...
            return {"status": "error", "message": "User for subscription not found"}
        elif result.modified_count == 0:
             logger.info(f"User subscription data not modified for update event {subscription_id} (maybe already up-to-date).")
        else:
            logger.info(f"Successfully updated user subscription {subscription_id} status to {internal_status.value}.")
        
        return {"status": "success"}

    except Exception as e:
        logger.error(f"Error updating user for subscription update {subscription_id}: {e}")
        return {"status": "error", "message": f"DB update failed: {e}"}


async def handle_customer_subscription_deleted(event: stripe.Event, user_collection):
    """
    Handle 'customer.subscription.deleted' events (cancellation).
    Sets subscription status to canceled.
    """
    subscription = event.data.object
    subscription_id = subscription.id
    
    logger.info(f"Handling subscription deletion for {subscription_id}.")

    update_data = {
        "subscription_status": SubscriptionStatus.CANCELED.value,
        "subscription_tier": SubscriptionTier.FREE.value, # Revert to FREE tier on cancellation
        "subscription_current_period_end": None, # Clear period end
        "stripe_subscription_id": None, # Optionally clear the ID, or keep for history
        "updated_at": datetime.now(timezone.utc)
    }

    try:
        result = await user_collection.update_one(
            {"stripe_subscription_id": subscription_id},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            logger.warning(f"No user found with subscription ID {subscription_id} for deletion event.")
            return {"status": "error", "message": "User for subscription not found"}
        elif result.modified_count == 0:
             logger.info(f"User subscription data not modified for delete event {subscription_id} (maybe already canceled).")
        else:
            logger.info(f"Successfully marked subscription {subscription_id} as canceled for user.")
            
        return {"status": "success"}

    except Exception as e:
        logger.error(f"Error updating user for subscription deletion {subscription_id}: {e}")
        return {"status": "error", "message": f"DB update failed: {e}"}


async def handle_webhook_event(event: stripe.Event, user_collection) -> Dict[str, Any]:
    """
    Central webhook event handler. Dispatches based on event type.
    """
    event_type = event.type
    
    logger.info(f"Processing webhook event: {event_type}")

    if event_type == "checkout.session.completed":
        return await handle_checkout_session_completed(event, user_collection)
    elif event_type == "customer.subscription.updated":
        return await handle_customer_subscription_updated(event, user_collection)
    elif event_type == "customer.subscription.deleted":
        return await handle_customer_subscription_deleted(event, user_collection)
    # Add handlers for other relevant events like:
    # - invoice.payment_succeeded (for renewals) -> update period end
    # - invoice.payment_failed -> update status to past_due/unpaid
    else:
        logger.info(f"Unhandled Stripe event type: {event_type}")
        return {"status": "ignored", "message": f"Unhandled event type: {event_type}"}

# --- End Re-implemented Webhook Handling ---


def get_subscription_price_id(tier: str) -> str:
    """
    Get the Stripe price ID for a subscription tier.
    """
    price_id = SUBSCRIPTION_PRICES.get(tier.lower())
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Invalid subscription tier: {tier}")
    return price_id
