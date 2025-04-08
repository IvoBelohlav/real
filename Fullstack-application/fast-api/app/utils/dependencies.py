# app/utils/dependencies.py
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.collection import Collection
from app.utils.mongo import get_db, get_user_collection # Import get_user_collection directly
# Restore original imports
from fastapi import Depends, HTTPException, Security, status, Header, Request
from fastapi.security import OAuth2PasswordBearer
from .jwt import verify_token, decode_token_without_verification
from app.utils.logging_config import get_module_logger
from typing import Optional, List, Dict, Any # Added Any
import logging
import secrets
import string
import urllib.parse
import re
import os
import secrets # Added for compare_digest
from app.models.user import User as UserModel, SubscriptionStatus # Import SubscriptionStatus
from urllib.parse import urlparse # Import urlparse for Origin header parsing

from app.services.constants import (
    PRODUCT_COLLECTION_NAME,
    QA_COLLECTION_NAME,
    COMPARISON_CONFIGS_COLLECTION_NAME,
    GUIDED_CHAT_FLOWS_COLLECTION_NAME,
    USER_COLLECTION_NAME,
    CONVERSATIONS_COLLECTION_NAME,
    BUSINESS_CONFIGS_COLLECTION_NAME
)

logger = get_module_logger(__name__)

# Restore OAuth2PasswordBearer scheme
# NOTE: The tokenUrl should ideally point to the actual login endpoint used by the frontend
# If next-auth handles login entirely client-side before calling other APIs, this might not be strictly necessary
# but it's standard practice for FastAPI docs generation. Let's assume the backend login is relevant.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login") # Point to backend login

# REMOVED ACCESS_COOKIE_NAME definition

async def get_product_collection(db: AsyncIOMotorClient = Depends(get_db)) -> Collection:
    """Returns the product collection."""
    return db.get_collection(PRODUCT_COLLECTION_NAME)

async def get_qa_collection(db: AsyncIOMotorClient = Depends(get_db)) -> Collection:
    """Returns the qa_items collection."""
    return db.get_collection(QA_COLLECTION_NAME)

async def get_comparison_configs_collection(db: AsyncIOMotorClient = Depends(get_db)) -> Collection:
    """Returns the comparison_configs collection."""
    return db.get_collection(COMPARISON_CONFIGS_COLLECTION_NAME)

async def get_guided_chat_flows_collection(db: AsyncIOMotorClient = Depends(get_db)) -> Collection:
    """Returns the guided chat flows collection."""
    return db.get_collection(GUIDED_CHAT_FLOWS_COLLECTION_NAME)

# Removed redundant get_user_collection from dependencies.py
# Use the version from mongo.py instead.
# async def get_user_collection(db: AsyncIOMotorClient = Depends(get_db)):
#    """Returns the user collection."""
#    return db.get_collection(USER_COLLECTION_NAME)

async def get_conversations_collection(db: AsyncIOMotorClient = Depends(get_db)):
    """Returns the conversations collection."""
    return db.get_collection(CONVERSATIONS_COLLECTION_NAME)

async def get_business_configs_collection(db: AsyncIOMotorClient = Depends(get_db)):
    """Returns the business configurations collection."""
    return db.get_collection(BUSINESS_CONFIGS_COLLECTION_NAME)

# Revert get_current_user to use OAuth2PasswordBearer (Authorization header)
async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncIOMotorClient = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"}, # Restore header for Bearer scheme
    )
    try:
        # Verify token from Authorization header
        payload = verify_token(token)
        user_id: str = payload.get("user_id")
        if user_id is None:
            logger.error("User ID not found in token")
            raise credentials_exception

        # Use the database passed in via dependency
        user_collection = db.get_collection(USER_COLLECTION_NAME)
        # Assuming user ID in DB is stored as 'id' string matching JWT
        user = await user_collection.find_one({"id": user_id})
        if user is None:
            logger.error(f"User not found in database for id: {user_id}")
            raise credentials_exception

        logger.debug(f"Authenticated user: {user_id}")
        return user # Return user dict
    except Exception as e:
        logger.error(f"Error in get_current_user: {e}")
        raise credentials_exception

async def get_current_active_user(current_user = Depends(get_current_user)):
    # Check if email verification is disabled for testing
    disable_verification = os.getenv("DISABLE_EMAIL_VERIFICATION", "false").lower() == "true"

    # Skip email verification check if disabled
    if not disable_verification and current_user.get("is_email_verified") is False:
        raise HTTPException(status_code=403, detail="Email not verified")
    return current_user

# New dependency for checking active subscription for dashboard features
async def require_active_subscription(
    current_user: dict = Depends(get_current_user) # Depends on JWT auth first
):
    """
    Ensures the current JWT-authenticated user has an active subscription.
    """
    if not current_user: # Should not happen if get_current_user works correctly
         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    # Check if the user's subscription status is active or trialing
    active_statuses = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] # Use Enum values
    user_status = current_user.get("subscription_status")

    if user_status not in active_statuses:
         logger.warning(f"User {current_user.get('id')} attempted access without active/trialing subscription. Status: {user_status}")
         raise HTTPException(
             status_code=status.HTTP_403_FORBIDDEN,
             detail="An active or trialing subscription is required for this feature."
         )
    # Removed optional plan check here - specific endpoints should check tier if needed.
    logger.debug(f"User {current_user.get('id')} has active/trialing subscription (Status: {user_status}), access granted by require_active_subscription.")
    return current_user # Return user if checks pass


# Removed require_admin_user dependency as the 'admin' tier is obsolete.


def extract_domain_from_referer(referer: Optional[str]) -> Optional[str]:
    """
    Extract the domain from a referer URL.
    """
    if not referer:
        return None
    try:
        parsed_url = urllib.parse.urlparse(referer)
        domain = parsed_url.netloc
        domain = domain.split(':')[0]
        if domain and '.' in domain:
            return domain
    except Exception as e:
        logger.warning(f"Error extracting domain from referer: {e}")
    return None

async def validate_domain_for_api_key(api_key: str, domain: str, db: AsyncIOMotorClient = None) -> bool:
    """
    Validate if the domain is authorized for the given API key.
    """
    if not domain:
        return False
    try:
        # FIX: Call get_user_collection without arguments, as it uses Depends internally
        user_collection = await get_user_collection()
        user = await user_collection.find_one({"api_key": api_key})
        if not user:
            return False
        # MARK: Corrected field name to match user model
        authorized_domains = user.get("domain_whitelist", [])
        if not authorized_domains:
            # If the list is empty or doesn't exist, allow all domains (as per original logic interpretation)
            # NOTE: Consider changing this to return False if empty for stricter security.
            return True 
            
        normalized_request_hostname = domain.lower() # Normalize the input domain

        for auth_domain_entry in authorized_domains: # Renamed loop variable
            normalized_auth_domain_entry = auth_domain_entry.lower().strip()
            if not normalized_auth_domain_entry:
                continue

            # --- FIX: Parse hostname from the stored domain entry ---
            stored_hostname = None
            try:
                if not normalized_auth_domain_entry.startswith(('http://', 'https://')):
                     parse_target = 'http://' + normalized_auth_domain_entry.lstrip('/')
                else:
                     parse_target = normalized_auth_domain_entry
                parsed_stored_domain = urlparse(parse_target)
                stored_hostname = parsed_stored_domain.hostname
                if not stored_hostname:
                     logger.warning(f"Could not parse hostname from stored domain: '{auth_domain_entry}' for API key {api_key[:5]}... Skipping.")
                     continue
            except Exception as e:
                logger.error(f"Error parsing stored domain '{auth_domain_entry}': {e}. Skipping.", exc_info=True)
                continue

            normalized_stored_hostname = stored_hostname.lower()
            # ---------------------------------------------------------

            # --- Compare HOSTNAMES ---
            # Add detailed logging for comparison
            logger.debug(f"Comparing request_hostname='{normalized_request_hostname}' with stored_hostname='{normalized_stored_hostname}' (from entry='{normalized_auth_domain_entry}')")

            if normalized_auth_domain_entry.startswith('*.'): # Check original entry for wildcard
                wildcard_base = normalized_stored_hostname
                # Check if the request hostname ends with ".<wildcard_base>" or is exactly "<wildcard_base>"
                if normalized_request_hostname.endswith('.' + wildcard_base) or normalized_request_hostname == wildcard_base:
                     pattern = r'^(.*\.)?' + re.escape(wildcard_base) + r'$'
                     if re.fullmatch(pattern, normalized_request_hostname):
                         logger.debug(f"Wildcard domain match: Request '{normalized_request_hostname}' vs Stored Pattern '{normalized_auth_domain_entry}'")
                         return True
            elif normalized_stored_hostname == normalized_request_hostname: # Exact hostname match
                logger.debug(f"Exact domain match: Request '{normalized_request_hostname}' vs Stored '{normalized_stored_hostname}'")
                return True
                
        # If loop completes without finding a match
        logger.warning(f"Domain validation failed: Request '{normalized_request_hostname}' not in allowed hostnames derived from {authorized_domains} for API key {api_key[:5]}...")
        return False
    except Exception as e:
        logger.error(f"Error validating domain for API key: {e}")
        return False

# --- Dependency for API Key Authentication (Widget/Public API) ---
async def get_user_from_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-Api-Key"),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """
    Authenticates a request based on the X-Api-Key header.
    Returns the user document if the key is valid and the subscription is active.
    Used for endpoints called directly by the widget or public API consumers.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing API Key",
    )
    forbidden_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Inactive subscription or invalid API key",
    )

    if not x_api_key:
        logger.warning("API Key missing from header")
        raise credentials_exception

    try:
        # Use the imported get_user_collection without passing db directly
        user_collection = await get_user_collection()
        user = await user_collection.find_one({"api_key": x_api_key})

        if not user:
            logger.warning(f"Invalid API Key provided: {x_api_key[:5]}...")
            raise credentials_exception

        # Check subscription status directly using the enum
        # Allow active or trialing subscriptions
        active_statuses = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]
        if user.get("subscription_status") not in active_statuses:
            logger.warning(f"API Key {x_api_key[:5]}... belongs to user {user.get('id')} with inactive status: {user.get('subscription_status')}")
            raise forbidden_exception # Raise 403 for inactive subscription

        logger.debug(f"API Key authenticated for user: {user.get('id')}")
        return user # Return the user document (dictionary)

    except Exception as e:
        logger.error(f"Error validating API key: {e}", exc_info=True)
        # Re-raise specific exceptions or a generic 500
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during API key validation"
        )

# This dependency remains for widget chat, as it includes domain validation
async def get_current_active_customer(
    request: Request,
    x_api_key: Optional[str] = Header(None),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """
    Authenticate users via API key for widget chat endpoints, including domain validation.
    """
    user = await get_user_from_api_key(x_api_key, db) # Reuse the core API key logic

    # Domain validation specific to widget chat
    referer = request.headers.get("referer")
    if referer:
        domain = extract_domain_from_referer(referer)
        # FIX: Remove the 'db' argument as validate_domain_for_api_key gets it via Depends now
        if domain and not await validate_domain_for_api_key(x_api_key, domain):
            logger.warning(f"Unauthorized domain: {domain} for API key: {x_api_key[:5]}...")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized domain")
    # If no referer or domain extraction fails, we might allow it or deny based on policy
    # Current logic allows if referer is missing or domain can't be extracted

    return user # Return user if all checks pass


def generate_api_key(length: int = 32) -> str:
    """Generate a secure API key of the specified length."""
    alphabet = string.ascii_letters + string.digits
    api_key = ''.join(secrets.choice(alphabet) for _ in range(length))
    return api_key


# --- Dependency for Internal API Communication ---
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET") # Load the secret from environment

async def verify_internal_secret(x_internal_secret: Optional[str] = Header(None, alias="X-Internal-Secret")):
    """Dependency to verify the internal shared secret header."""
    if not INTERNAL_SECRET:
        logger.error("INTERNAL_SECRET environment variable not set. Cannot verify internal requests.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal configuration error."
        )
    if not x_internal_secret or not secrets.compare_digest(x_internal_secret, INTERNAL_SECRET):
        logger.warning("Invalid or missing X-Internal-Secret header.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid internal secret."
        )
    # If secret is valid, proceed without returning anything specific
    logger.debug("Internal secret verified successfully.")


# --- New Dependency for Widget Origin Verification ---
async def verify_widget_origin(
    request: Request,
    x_api_key: Optional[str] = Header(None, alias="X-Api-Key"),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """
    Authenticates widget requests via API key and verifies the request Origin
    against the user's domain whitelist. Stricter than get_current_active_customer.
    """
    # --- 1. API Key Validation & User Fetch ---
    api_key_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing API Key",
    )
    subscription_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Inactive subscription associated with API key",
    )

    if not x_api_key:
        logger.warning("API Key missing from header for origin verification.")
        raise api_key_exception

    user = None
    try:
        # FIX: Call get_user_collection without passing db directly
        user_collection = await get_user_collection() 
        user = await user_collection.find_one({"api_key": x_api_key})

        if not user:
            logger.warning(f"Invalid API Key provided for origin verification: {x_api_key[:5]}...")
            raise api_key_exception

        # --- 2. Subscription Status Check ---
        active_statuses = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]
        if user.get("subscription_status") not in active_statuses:
            logger.warning(f"API Key {x_api_key[:5]}... belongs to user {user.get('id')} with inactive status: {user.get('subscription_status')}")
            raise subscription_exception

        logger.debug(f"API Key validated for user: {user.get('id')} for origin check.")

    except Exception as e:
        logger.error(f"Error during API key validation/user fetch in verify_widget_origin: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during API key validation"
        )

    # --- 3. Origin Header Verification ---
    origin_header = request.headers.get("origin")
    origin_missing_exception = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST, # 400 Bad Request might be more appropriate than 403
        detail="Origin header missing in request.",
    )
    domain_forbidden_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Domain not authorized for this API Key.",
    )

    if not origin_header:
        logger.warning(f"Origin header missing for API key: {x_api_key[:5]}...")
        raise origin_missing_exception

    # --- 4. Parse Hostname from Origin ---
    request_hostname = None
    try:
        parsed_origin = urlparse(origin_header)
        # netloc contains 'hostname:port', we only want hostname
        request_hostname = parsed_origin.hostname
        if not request_hostname:
            # Handle cases like 'Origin: null' or invalid URLs
            logger.warning(f"Could not parse hostname from Origin header: '{origin_header}' for API key: {x_api_key[:5]}...")
            raise domain_forbidden_exception # Treat unparseable origins as forbidden
    except Exception as e:
        logger.error(f"Error parsing Origin header '{origin_header}': {e}", exc_info=True)
        raise domain_forbidden_exception # Treat parsing errors as forbidden

    # --- 5. Check Against Whitelist (with localhost bypass) ---
    # Allow requests from localhost/127.0.0.1 (common for local dashboards) without checking whitelist
    if request_hostname in ["localhost", "127.0.0.1"]:
        logger.debug(f"Origin '{origin_header}' is localhost/127.0.0.1, bypassing domain whitelist check for user {user.get('id')}.")
        return user # Allow local development access

    # --- Whitelist Check (for non-localhost origins) ---
    authorized_domains = user.get("domain_whitelist", [])

    # If whitelist is empty, NO domains are allowed (stricter than previous logic)
    # To allow all if empty, uncomment the next two lines:
    # if not authorized_domains:
    #     logger.debug(f"Empty domain whitelist for user {user.get('id')}, allowing origin {request_hostname}.")
    #     return user # Allow if whitelist is empty

    is_authorized = False
    normalized_request_hostname = request_hostname.lower() # Normalize for comparison

    for auth_domain in authorized_domains:
        normalized_auth_domain_entry = auth_domain.lower().strip()
        if not normalized_auth_domain_entry: # Skip empty entries in the list
            continue

        # --- FIX: Parse hostname from the stored domain entry ---
        stored_hostname = None
        try:
            # Handle potential schemes missing or // prefix
            if not normalized_auth_domain_entry.startswith(('http://', 'https://')):
                 # Add a default scheme if missing for urlparse to work correctly
                 parse_target = 'http://' + normalized_auth_domain_entry.lstrip('/')
            else:
                 parse_target = normalized_auth_domain_entry

            parsed_stored_domain = urlparse(parse_target)
            stored_hostname = parsed_stored_domain.hostname
            if not stored_hostname:
                 logger.warning(f"Could not parse hostname from stored domain: '{auth_domain}' for user {user.get('id')}. Skipping.")
                 continue # Skip this entry if hostname parsing fails
        except Exception as e:
            logger.error(f"Error parsing stored domain '{auth_domain}': {e}. Skipping.", exc_info=True)
            continue # Skip this entry on error

        # Normalize the parsed stored hostname
        normalized_stored_hostname = stored_hostname.lower()
        # ---------------------------------------------------------

        # Handle wildcard matching (*.example.com) - Compare hostnames
        # Check if the stored domain starts with wildcard AFTER scheme removal
        # Example: *.dvojkavit.cz (parsed hostname: dvojkavit.cz)
        # We need to check the original entry for the wildcard pattern
        if normalized_auth_domain_entry.startswith('*.'):
            # Compare the request hostname against the pattern derived from the stored hostname
            # e.g., request 'sub.dvojkavit.cz' should match stored '*.dvojkavit.cz'
            wildcard_base = normalized_stored_hostname # e.g., dvojkavit.cz
            # Check if the request hostname ends with ".<wildcard_base>" or is exactly "<wildcard_base>"
            if normalized_request_hostname.endswith('.' + wildcard_base) or normalized_request_hostname == wildcard_base:
                 # More precise regex might be needed for edge cases, but this covers common scenarios
                 pattern = r'^(.*\.)?' + re.escape(wildcard_base) + r'$'
                 if re.fullmatch(pattern, normalized_request_hostname):
                     is_authorized = True
                     logger.debug(f"Wildcard match: Request '{normalized_request_hostname}' vs Stored Pattern '{normalized_auth_domain_entry}' (Base: '{wildcard_base}')")
                     break
        # Handle exact domain matching - Compare hostnames
        elif normalized_stored_hostname == normalized_request_hostname:
            is_authorized = True
            logger.debug(f"Exact match: Request '{normalized_request_hostname}' vs Stored '{normalized_stored_hostname}' (Original Entry: '{auth_domain}')")
            break

    if not is_authorized:
        logger.warning(f"Unauthorized Origin: '{origin_header}' (parsed hostname: '{request_hostname}') for API key: {x_api_key[:5]}... User: {user.get('id')}. Allowed hostnames (parsed): {[urlparse('http://' + d.lstrip('/') if not d.startswith(('http://', 'https://')) else d).hostname for d in authorized_domains if d]}")
        raise domain_forbidden_exception

    logger.debug(f"Origin '{origin_header}' verified for user {user.get('id')}")
    return user # Return the user document if all checks pass