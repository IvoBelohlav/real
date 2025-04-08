from fastapi import APIRouter, Depends, HTTPException, Header, Request, status, Body # Keep Body import
from pydantic import BaseModel, HttpUrl, Field
from app.models.subscription import (
    CreateCheckoutSessionResponse,
    SubscriptionDetails,
    CustomerPortalRequest,
    CustomerPortalResponse # Re-import CustomerPortalResponse
    # Removed EmbedSnippet, ApiKeyResponse as they belong elsewhere
)
# Removed generate_api_key from dependencies as it's not directly used here anymore
# Webhook logic uses it, but it's called within the webhook handler itself
from app.utils.dependencies import get_current_user
from app.utils.mongo import get_user_collection, get_db
from app.utils.stripe_utils import (
    create_checkout_session,
    get_subscription,
    create_portal_session,
    create_customer,
    get_subscription_price_id,
    STRIPE_WEBHOOK_SECRET
)
from datetime import datetime, timezone, timedelta
from app.utils.logging_config import get_module_logger
from typing import Dict, Any, Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
import os
from app.models.user import SubscriptionTier, SubscriptionStatus # Import Enums
import stripe
from bson import ObjectId

# Setup Stripe
STRIPE_SECRET_KEY = os.getenv("STRIPE_API_KEY")
DASHBOARD_URL = os.getenv("DASHBOARD_URL", "http://localhost:3000")

logger = get_module_logger(__name__)

if not STRIPE_SECRET_KEY:
    logger.warning("STRIPE_API_KEY not set. Stripe functionality will not work.")
else:
    stripe.api_key = STRIPE_SECRET_KEY

if not STRIPE_WEBHOOK_SECRET:
     logger.warning("STRIPE_WEBHOOK_SECRET not set. Webhook verification will fail.")

# --- Pydantic Models ---
class CreateCheckoutSessionRequest(BaseModel):
    priceId: str = Field(..., description="The Stripe Price ID for the subscription.")
    success_url: Optional[HttpUrl] = Field(None, description="URL to redirect to on successful checkout.")
    cancel_url: Optional[HttpUrl] = Field(None, description="URL to redirect to on canceled checkout.")

# --- Router ---
router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

# --- Helper ---
def get_tier_from_price_id(tier_identifier: Optional[str]) -> SubscriptionTier:
    """
    Determines the SubscriptionTier based on a Stripe Price ID or a tier name string.
    Handles potential legacy data where tier names might be stored.
    """
    # Directly use the known Price IDs provided by the user (or fetch from env/config)
    # Ensure these match your Stripe setup EXACTLY
    BASIC_PRICE_ID = os.getenv("STRIPE_BASIC_PRICE_ID", "price_1RAIdCR4qkxDUOaXTJ7tN1HU") # Example fallback
    PREMIUM_PRICE_ID = os.getenv("STRIPE_PREMIUM_PRICE_ID", "price_1RAIdbR4qkxDUOaXOszn1Fs2") # Example fallback
    ENTERPRISE_PRICE_ID = os.getenv("STRIPE_ENTERPRISE_PRICE_ID", "price_1RAIeIR4qkxDUOaXS39pud7M") # Example fallback

    logger.debug(f"[getTierFromPriceId] Determining tier for identifier: '{tier_identifier}'")

    if not tier_identifier:
        logger.debug("Identifier is None or empty, defaulting to FREE.")
        return SubscriptionTier.FREE

    # 1. Check if the identifier matches a known Price ID
    if tier_identifier == BASIC_PRICE_ID:
        logger.debug(f"Identifier matched BASIC Price ID: {tier_identifier}")
        return SubscriptionTier.BASIC
    if tier_identifier == PREMIUM_PRICE_ID:
        logger.debug(f"Identifier matched PREMIUM Price ID: {tier_identifier}")
        return SubscriptionTier.PREMIUM
    if tier_identifier == ENTERPRISE_PRICE_ID:
        logger.debug(f"Identifier matched ENTERPRISE Price ID: {tier_identifier}")
        return SubscriptionTier.ENTERPRISE

    # 2. Check if the identifier matches a known tier name (case-insensitive fallback for legacy data)
    tier_name_lower = tier_identifier.lower()
    if tier_name_lower == "basic":
        logger.warning(f"Identifier '{tier_identifier}' matched tier name 'basic'. Using BASIC tier. (Consider updating DB to store Price ID)")
        return SubscriptionTier.BASIC
    if tier_name_lower == "premium":
        logger.warning(f"Identifier '{tier_identifier}' matched tier name 'premium'. Using PREMIUM tier. (Consider updating DB to store Price ID)")
        return SubscriptionTier.PREMIUM
    if tier_name_lower == "enterprise":
        logger.warning(f"Identifier '{tier_identifier}' matched tier name 'enterprise'. Using ENTERPRISE tier. (Consider updating DB to store Price ID)")
        return SubscriptionTier.ENTERPRISE
    if tier_name_lower == "free":
         logger.debug(f"Identifier matched tier name 'free'. Using FREE tier.")
         return SubscriptionTier.FREE

    # 3. Fallback if no match
    logger.warning(f"[getTierFromPriceId] Identifier '{tier_identifier}' did not match known Price IDs or tier names. Defaulting to FREE.")
    return SubscriptionTier.FREE

# --- API Endpoints ---
@router.post("/create-checkout-session", response_model=CreateCheckoutSessionResponse)
async def create_new_checkout_session(
    request: CreateCheckoutSessionRequest,
    current_user: Dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_db) # Add DB dependency
):
    """
    Create a checkout session for a new subscription, only if the user doesn't already have one.
    """
    user_id = current_user.get("id")
    email = current_user.get("email")
    username = current_user.get("username")
    # Check current subscription status directly from the user object fetched by get_current_user
    current_status_str = current_user.get("subscription_status")
    try:
        current_status = SubscriptionStatus(current_status_str) if current_status_str else SubscriptionStatus.INACTIVE
    except ValueError:
        current_status = SubscriptionStatus.INACTIVE # Default if invalid value in DB

    # Prevent creating a new session if already active or trialing
    if current_status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]:
        logger.warning(f"User {user_id} attempted to create checkout session while already having status: {current_status}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has an active or trialing subscription."
        )

    stripe_customer_id = current_user.get("stripe_customer_id")

    if not user_id or not email:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User information missing")

    if not stripe_customer_id:
        logger.info(f"No Stripe customer ID found for user {user_id}. Creating new customer.")
        try:
            customer = await create_customer(email=email, name=username)
            stripe_customer_id = customer.id
            # Use the db dependency directly
            user_collection = db.get_collection("users") # Assuming collection name is 'users'
            await user_collection.update_one(
                {"id": user_id},
                {"$set": {"stripe_customer_id": stripe_customer_id}}
            )
            logger.info(f"Associated Stripe customer {stripe_customer_id} with user {user_id}")
        except HTTPException as e:
            raise e
        except Exception as e:
            logger.error(f"Unexpected error creating/updating customer for user {user_id}: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create customer record")

    try:
        checkout_session = await create_checkout_session(
            customer_id=stripe_customer_id,
            price_id=request.priceId,
            user_id=str(user_id),
            success_url=str(request.success_url) if request.success_url else None,
            cancel_url=str(request.cancel_url) if request.cancel_url else None
        )
    except HTTPException as e:
         raise e
    except Exception as e:
        logger.error(f"Unexpected error creating checkout session for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create checkout session")

    return CreateCheckoutSessionResponse(checkout_url=checkout_session.url, session_id=checkout_session.id)

@router.get("/status", response_model=Optional[SubscriptionDetails])
async def get_current_subscription_status(current_user: Dict = Depends(get_current_user)):
    """
    Get the current subscription status and details for the user from the database.
    Returns null if no active/trialing subscription exists in the DB.
    """
    user_id = current_user.get("id")
    db_status_str = current_user.get("subscription_status")
    db_tier_identifier = current_user.get("subscription_tier") # This could be Price ID or legacy tier name
    db_end_date = current_user.get("subscription_current_period_end") # Correct field name
    subscription_id = current_user.get("stripe_subscription_id")
    stripe_customer_id = current_user.get("stripe_customer_id")
    cancel_at_period_end = current_user.get("cancel_at_period_end", False) # This field might not be set by current webhook logic
    created_at = current_user.get("created_at")

    logger.debug(f"Fetching subscription status for user {user_id} from DB.")

    try:
        db_status = SubscriptionStatus(db_status_str) if db_status_str else SubscriptionStatus.INACTIVE
        # Use the updated helper function to convert identifier (Price ID or name) to SubscriptionTier enum
        db_tier_enum = get_tier_from_price_id(db_tier_identifier)
    except ValueError:
        # Handle potential errors converting status string to enum
        logger.error(f"Invalid status enum value found in DB for user {user_id}: status='{db_status_str}'")
        db_status = SubscriptionStatus.INACTIVE # Default to inactive on error
        db_tier_enum = SubscriptionTier.FREE # Default to free on error

    # Return details only if the status is active/trialing and we have an end date
    if db_status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] and db_end_date:
         logger.info(f"Returning subscription status from DB for user {user_id}: Status={db_status.value}, TierEnum={db_tier_enum.value}, Identifier='{db_tier_identifier}'")
         return SubscriptionDetails(
            id=subscription_id or "db_managed", # Use subscription ID if available
             customer_id=stripe_customer_id or "",
             status=db_status.value, # Return the string value of the enum
             current_period_end=db_end_date,
             tier=db_tier_enum, # Return the SubscriptionTier enum value
             planId=db_tier_identifier, # Return the actual identifier stored in the DB (Price ID or name)
             cancel_at_period_end=cancel_at_period_end,
             created_at=created_at or datetime.now(timezone.utc), # Provide a default if missing
             payment_method="" # Placeholder, fetch if needed
        )
    else:
        logger.info(f"No active/trialing subscription found in DB for user {user_id}. Status: {db_status}")
        return None

# Reinstate response_model
@router.post("/create-portal-session", response_model=CustomerPortalResponse)
async def create_customer_portal_session(
    # Provide a default instance using Body if the request body is empty/missing
    request: CustomerPortalRequest = Body(default=CustomerPortalRequest()),
    current_user: Dict = Depends(get_current_user)
):
    """
    Create a Stripe customer portal session for managing subscriptions.
    """
    stripe_customer_id = current_user.get("stripe_customer_id")
    user_id = current_user.get("id")

    if not stripe_customer_id:
        logger.warning(f"User {user_id} attempted to access portal without stripe_customer_id")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Stripe customer ID not found for this user.")

    return_url = str(request.return_url) if request.return_url else f"{DASHBOARD_URL}/billing"

    try:
        portal_session = await create_portal_session(customer_id=stripe_customer_id, return_url=return_url)
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Unexpected error creating portal session for customer {stripe_customer_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create portal session")

    # Log the portal session object before attempting to access .url
    logger.debug(f"Stripe Portal Session object received: {portal_session}")

    # Explicitly return the CustomerPortalResponse model using the URL from the session
    # Use dictionary access ['url'] which is safer for Stripe objects and add error handling
    try:
        portal_url = portal_session['url'] # Use dictionary access
        return CustomerPortalResponse(portal_url=portal_url)
    except KeyError:
        logger.error(f"Stripe portal session object missing 'url' key: {portal_session}")
        raise HTTPException(status_code=500, detail="Failed to retrieve portal session URL from Stripe response.")
    except Exception as e: # Catch any other unexpected errors accessing the url
        logger.error(f"Unexpected error accessing portal session URL: {e}. Session object: {portal_session}")
        raise HTTPException(status_code=500, detail="Unexpected error processing portal session response.")

# NOTE: The /webhook endpoint below was likely a duplicate or intended for internal use.
# The primary webhook handler used by 'stripe listen' and configured in Stripe
# should be the one in `payments.py` mounted at `/api/webhooks/stripe`.
# Removing this duplicate handler to avoid confusion.
