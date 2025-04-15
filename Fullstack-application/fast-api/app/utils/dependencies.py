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
from .mongo import get_user_collection # Ensure get_user_collection is imported here too

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
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login") # Point to backend login

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
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = verify_token(token)
        user_id: str = payload.get("user_id")
        if user_id is None:
            logger.error("User ID not found in token")
            raise credentials_exception

        user_collection = db.get_collection(USER_COLLECTION_NAME)
        user = await user_collection.find_one({"id": user_id})
        if user is None:
            logger.error(f"User not found in database for id: {user_id}")
            raise credentials_exception

        logger.debug(f"Authenticated user: {user_id}")
        return user
    except Exception as e:
        logger.error(f"Error in get_current_user: {e}")
        raise credentials_exception

async def get_current_active_user(current_user = Depends(get_current_user)):
    disable_verification = os.getenv("DISABLE_EMAIL_VERIFICATION", "false").lower() == "true"
    if not disable_verification and current_user.get("is_email_verified") is False:
        raise HTTPException(status_code=403, detail="Email not verified")
    return current_user

# New dependency for checking active subscription for dashboard features
async def require_active_subscription(
    current_user: dict = Depends(get_current_user)
):
    """
    Ensures the current JWT-authenticated user has an active subscription.
    """
    if not current_user:
         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    active_statuses = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]
    user_status = current_user.get("subscription_status")

    if user_status not in active_statuses:
         logger.warning(f"User {current_user.get('id')} attempted access without active/trialing subscription. Status: {user_status}")
         raise HTTPException(
             status_code=status.HTTP_403_FORBIDDEN,
             detail="An active or trialing subscription is required for this feature."
         )
    logger.debug(f"User {current_user.get('id')} has active/trialing subscription (Status: {user_status}), access granted by require_active_subscription.")
    return current_user


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
    (Note: This function is less strict than verify_widget_origin and might be deprecated)
    """
    if not domain:
        return False
    try:
        user_collection = await get_user_collection()
        user = await user_collection.find_one({"api_key": api_key})
        if not user:
            return False
        authorized_domains = user.get("domain_whitelist", [])
        if not authorized_domains:
            # Original logic: Allow if empty (Consider changing for stricter security)
            return True

        normalized_request_hostname = domain.lower()

        for auth_domain_entry in authorized_domains:
            normalized_auth_domain_entry = auth_domain_entry.lower().strip()
            if not normalized_auth_domain_entry:
                continue

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

            logger.debug(f"Comparing request_hostname='{normalized_request_hostname}' with stored_hostname='{normalized_stored_hostname}' (from entry='{normalized_auth_domain_entry}')")

            if normalized_auth_domain_entry.startswith('*.'):
                wildcard_base = normalized_stored_hostname
                if normalized_request_hostname.endswith('.' + wildcard_base) or normalized_request_hostname == wildcard_base:
                     pattern = r'^(.*\.)?' + re.escape(wildcard_base) + r'$'
                     if re.fullmatch(pattern, normalized_request_hostname):
                         logger.debug(f"Wildcard domain match: Request '{normalized_request_hostname}' vs Stored Pattern '{normalized_auth_domain_entry}'")
                         return True
            elif normalized_stored_hostname == normalized_request_hostname:
                logger.debug(f"Exact domain match: Request '{normalized_request_hostname}' vs Stored '{normalized_stored_hostname}'")
                return True

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
        user_collection = await get_user_collection()
        user = await user_collection.find_one({"api_key": x_api_key})

        if not user:
            logger.warning(f"Invalid API Key provided: {x_api_key[:5]}...")
            raise credentials_exception

        active_statuses = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]
        if user.get("subscription_status") not in active_statuses:
            logger.warning(f"API Key {x_api_key[:5]}... belongs to user {user.get('id')} with inactive status: {user.get('subscription_status')}")
            raise forbidden_exception

        logger.debug(f"API Key authenticated for user: {user.get('id')}")
        return user

    except Exception as e:
        logger.error(f"Error validating API key: {e}", exc_info=True)
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
    (Note: Uses less strict Referer header and validate_domain_for_api_key)
    """
    user = await get_user_from_api_key(x_api_key, db)

    referer = request.headers.get("referer")
    if referer:
        domain = extract_domain_from_referer(referer)
        if domain and not await validate_domain_for_api_key(x_api_key, domain):
            logger.warning(f"Unauthorized domain (Referer check): {domain} for API key: {x_api_key[:5]}...")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized domain (Referer)")

    return user


def generate_api_key(length: int = 32) -> str:
    """Generate a secure API key of the specified length."""
    alphabet = string.ascii_letters + string.digits
    api_key = ''.join(secrets.choice(alphabet) for _ in range(length))
    return api_key


# --- Dependency for Internal API Communication ---
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET")

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
    logger.debug("Internal secret verified successfully.")


# --- Dependency for Widget Origin Verification (Strict: Requires API Key + Origin Match) ---
async def verify_widget_origin(
    request: Request,
    x_api_key: Optional[str] = Header(None, alias="X-Api-Key"),
    db: AsyncIOMotorClient = Depends(get_db)
):
    """
    Authenticates widget requests via API key AND verifies the request Origin
    against the user's domain whitelist. Used for most public widget endpoints.
    """
    # --- 1. API Key Validation & User Fetch ---
    user = await get_user_from_api_key(x_api_key, db) # Reuse API key validation (includes subscription check)

    # --- 2. Origin Header Verification ---
    origin_header = request.headers.get("origin")
    origin_missing_exception = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Origin header missing in request.",
    )
    domain_forbidden_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Domain not authorized for this API Key.",
    )

    if not origin_header:
        logger.warning(f"Origin header missing for API key: {x_api_key[:5]}...")
        raise origin_missing_exception

    # --- 3. Parse Hostname from Origin ---
    request_hostname = None
    try:
        parsed_origin = urlparse(origin_header)
        request_hostname = parsed_origin.hostname
        if not request_hostname:
            logger.warning(f"Could not parse hostname from Origin header: '{origin_header}' for API key: {x_api_key[:5]}...")
            raise domain_forbidden_exception
    except Exception as e:
        logger.error(f"Error parsing Origin header '{origin_header}': {e}", exc_info=True)
        raise domain_forbidden_exception

    # --- 4. Check Against Whitelist (with localhost bypass) ---
    if request_hostname in ["localhost", "127.0.0.1"]:
        logger.debug(f"Origin '{origin_header}' is localhost/127.0.0.1, bypassing domain whitelist check for user {user.get('id')}.")
        return user

    # --- 5. Whitelist Check (for non-localhost origins) ---
    authorized_domains = user.get("domain_whitelist", [])

    # Explicitly handle empty whitelist: Deny access
    if not authorized_domains:
        logger.warning(f"DENIED (Empty Whitelist): Unauthorized Origin: '{origin_header}' (hostname: '{request_hostname}') for API key: {x_api_key[:5]}... User: {user.get('id')}.")
        raise domain_forbidden_exception

    is_authorized = False
    normalized_request_hostname = request_hostname.lower()

    for auth_domain in authorized_domains:
        normalized_auth_domain_entry = auth_domain.lower().strip()
        if not normalized_auth_domain_entry:
            continue

        stored_hostname = None
        try:
            # Parse hostname from stored entry (handle missing scheme)
            if not normalized_auth_domain_entry.startswith(('http://', 'https://')):
                 parse_target = 'http://' + normalized_auth_domain_entry.lstrip('/')
            else:
                 parse_target = normalized_auth_domain_entry
            parsed_stored_domain = urlparse(parse_target)
            stored_hostname = parsed_stored_domain.hostname
            if not stored_hostname:
                 logger.warning(f"Could not parse hostname from stored domain: '{auth_domain}' for user {user.get('id')}. Skipping.")
                 continue
        except Exception as e: # Corrected: Added except block
            logger.error(f"Error parsing stored domain '{auth_domain}': {e}. Skipping.", exc_info=True)
            continue # Skip this entry on error

        # Normalize the parsed stored hostname
        normalized_stored_hostname = stored_hostname.lower()
        # ---------------------------------------------------------

        # --- Compare HOSTNAMES (Reverted to Parsed Hostname Comparison for Exact Match) ---
        logger.debug(f"Comparing request_hostname='{normalized_request_hostname}' with stored_hostname='{normalized_stored_hostname}' (from entry='{normalized_auth_domain_entry}')")

        # Wildcard Check (*.example.com) - Check original normalized entry string
        if normalized_auth_domain_entry.startswith('*.'):
            # Extract base pattern directly from the entry string
            base_domain_pattern = normalized_auth_domain_entry[2:] # e.g., 'example.com'
            # Check if request hostname is the base OR ends with '.base'
            if (normalized_request_hostname == base_domain_pattern or
                normalized_request_hostname.endswith('.' + base_domain_pattern)):
                 logger.info(f"AUTHORIZED (Wildcard): Request '{normalized_request_hostname}' matches pattern '{normalized_auth_domain_entry}'")
                 is_authorized = True
                 break # Exit loop on first match
            else:
                 logger.debug(f"No wildcard match: Request '{normalized_request_hostname}' vs pattern '{normalized_auth_domain_entry}'")

        # Exact Match Check (non-wildcard entries) - Compare parsed hostnames
        elif normalized_stored_hostname and normalized_stored_hostname == normalized_request_hostname:
             logger.info(f"AUTHORIZED (Parsed Exact): Request '{normalized_request_hostname}' matches parsed hostname '{normalized_stored_hostname}' from entry '{normalized_auth_domain_entry}'")
             is_authorized = True
             break
        else:
             logger.debug(f"No exact match: Request '{normalized_request_hostname}' vs entry '{normalized_auth_domain_entry}' (parsed: {normalized_stored_hostname})")

    # Loop finished, check authorization status
    if not is_authorized:
        logger.warning(f"DENIED: Unauthorized Origin: '{origin_header}' (hostname: '{request_hostname}') for API key: {x_api_key[:5]}... User: {user.get('id')}. Allowed domains: {authorized_domains}")
        raise domain_forbidden_exception

    logger.debug(f"Origin '{origin_header}' verified for user {user.get('id')}")
    return user


# --- Dependency for Public Config Endpoint (Origin Check Only) ---
async def verify_widget_origin_for_config(
    request: Request,
    db: AsyncIOMotorClient = Depends(get_db)
):
    """
    Verifies the request Origin against ANY user's domain whitelist.
    Used ONLY for the initial public widget config fetch.
    Does NOT require or validate the API key header itself.
    Returns the user document associated with the *first* matching domain found.
    """
    # --- 1. Origin Header Verification ---
    origin_header = request.headers.get("origin")
    origin_missing_exception = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Origin header missing in request.",
    )
    domain_forbidden_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Domain not authorized.", # Generic message as API key isn't checked here
    )

    if not origin_header:
        logger.warning("Origin header missing for config request.")
        raise origin_missing_exception

    # --- 2. Parse Hostname from Origin ---
    request_hostname = None
    try:
        parsed_origin = urlparse(origin_header)
        request_hostname = parsed_origin.hostname
        if not request_hostname:
            logger.warning(f"Could not parse hostname from Origin header: '{origin_header}' for config request.")
            raise domain_forbidden_exception
    except Exception as e:
        logger.error(f"Error parsing Origin header '{origin_header}' for config request: {e}", exc_info=True)
        raise domain_forbidden_exception

    # --- 3. Handle Localhost/127.0.0.1 Origin ---
    if request_hostname in ["localhost", "127.0.0.1"]:
        logger.debug(f"Origin '{origin_header}' is localhost/127.0.0.1. Attempting API key lookup for config.")
        x_api_key = request.headers.get("x-api-key")
        if not x_api_key:
            logger.warning(f"Origin is localhost/127.0.0.1, but X-Api-Key header is missing for config request.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="X-Api-Key header required for localhost config access."
            )
        try:
            # Find user by API key (similar logic to get_user_from_api_key but simplified for this context)
            user_collection_local = await get_user_collection() # Use local var name to avoid conflict
            user = await user_collection_local.find_one({"api_key": x_api_key})
            if not user:
                logger.warning(f"Invalid API Key provided in header for localhost config access: {x_api_key[:5]}...")
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key for localhost config access.")

            # Check subscription status even for localhost access via API key
            active_statuses = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]
            if user.get("subscription_status") not in active_statuses:
                 logger.warning(f"API Key {x_api_key[:5]}... (localhost config) belongs to user {user.get('id')} with inactive status: {user.get('subscription_status')}")
                 raise HTTPException(
                     status_code=status.HTTP_403_FORBIDDEN,
                     detail="Domain owner subscription is inactive.",
                 )

            logger.info(f"CONFIG AUTH (Localhost API Key): Found user {user.get('id')} via API key for origin '{origin_header}'.")
            return user # Return the user found via API key

        except HTTPException as e:
             raise e # Re-raise specific HTTP exceptions
        except Exception as e:
             logger.error(f"Error during localhost API key lookup for config: {e}", exc_info=True)
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error verifying API key for localhost.")

    # --- 4. Find User Based on Domain Whitelist (Non-Localhost Origins) ---
    user_collection = await get_user_collection() # Now this is only for non-localhost
    normalized_request_hostname = request_hostname.lower()
    found_user = None

    # Iterate through ALL users to find one whose whitelist matches the origin
    async for user in user_collection.find({"domain_whitelist": {"$exists": True, "$ne": []}}): # Find users with non-empty whitelists
        authorized_domains = user.get("domain_whitelist", [])
        user_id_for_log = user.get("id", "UNKNOWN") # For logging

        for auth_domain in authorized_domains:
            normalized_auth_domain_entry = auth_domain.lower().strip()
            if not normalized_auth_domain_entry:
                continue

            stored_hostname = None
            try:
                if not normalized_auth_domain_entry.startswith(('http://', 'https://')):
                     parse_target = 'http://' + normalized_auth_domain_entry.lstrip('/')
                else:
                     parse_target = normalized_auth_domain_entry
                parsed_stored_domain = urlparse(parse_target)
                stored_hostname = parsed_stored_domain.hostname
                if not stored_hostname:
                     continue
            except Exception:
                continue # Skip invalid entries

            normalized_stored_hostname = stored_hostname.lower()

            # Wildcard Check
            if normalized_auth_domain_entry.startswith('*.'):
                base_domain_pattern = normalized_auth_domain_entry[2:]
                if (normalized_request_hostname == base_domain_pattern or
                    normalized_request_hostname.endswith('.' + base_domain_pattern)):
                     logger.info(f"CONFIG AUTH (Wildcard): Origin '{origin_header}' matches pattern '{normalized_auth_domain_entry}' for user {user_id_for_log}")
                     found_user = user
                     break # Found a match for this user
            # Exact Match Check
            else:
                if (normalized_auth_domain_entry == normalized_request_hostname or
                    normalized_stored_hostname == normalized_request_hostname):
                     logger.info(f"CONFIG AUTH (Exact): Origin '{origin_header}' matches entry '{normalized_auth_domain_entry}' or parsed '{normalized_stored_hostname}' for user {user_id_for_log}")
                     found_user = user
                     break # Found a match for this user

        if found_user:
            break # Exit outer loop once a matching user is found

    if not found_user:
        logger.warning(f"DENIED (No Match): Unauthorized Origin: '{origin_header}' (hostname: '{request_hostname}') for config request. No user found with this domain whitelisted.")
        raise domain_forbidden_exception

    # --- 5. Subscription Status Check for Found User ---
    # Even for config, ensure the user associated with the domain has an active subscription
    active_statuses = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]
    if found_user.get("subscription_status") not in active_statuses:
        logger.warning(f"DENIED (Inactive Sub): Origin '{origin_header}' belongs to user {found_user.get('id')} with inactive status: {found_user.get('subscription_status')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Domain owner subscription is inactive.",
        )

    logger.debug(f"Origin '{origin_header}' verified for config request, user {found_user.get('id')}")
    return found_user # Return the user document associated with the domain
