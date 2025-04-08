from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Optional
from urllib.parse import unquote # Import unquote

from app.utils.dependencies import get_current_user
from app.utils.mongo import get_user_collection
from app.models.user import SubscriptionTier # Import Enum for tier check
from app.utils.logging_config import get_module_logger

logger = get_module_logger(__name__)
router = APIRouter(prefix="/domains", tags=["domains"])

# --- Pydantic Models ---
# No longer needed as we return List[Dict] directly
# class AuthorizedDomainsList(BaseModel):
#    """Response model for authorized domains list."""
#    domains: List[str]

class DomainResponseItem(BaseModel):
    """Model for a single domain item in the response list."""
    id: str # Using domain name as ID for simplicity
    domain_name: str

class DomainRequest(BaseModel):
    """Request model for adding or removing a domain."""
    domain: str

# --- Endpoints ---
# Return type changed to List[DomainResponseItem]
@router.get("", response_model=List[DomainResponseItem])
async def get_authorized_domains(current_user: Dict = Depends(get_current_user)):
    """
    Get the list of authorized domains for the current user.
    These domains are allowed to use the user's API key.
    """
    user_id = current_user.get("id")
    user_collection = await get_user_collection()
    user_doc = await user_collection.find_one({"id": user_id})
    if not user_doc:
        # This case should ideally not happen if get_current_user works, but handle defensively
        logger.error(f"User {user_id} authenticated but not found in DB for domain fetch.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    domains_list = user_doc.get("domain_whitelist", [])
    logger.info(f"Fetched {len(domains_list)} domains for user {user_id}")
    # Map list of strings to list of dicts/objects
    response_data = [{"id": domain, "domain_name": domain} for domain in domains_list]
    return response_data

# Return type changed to List[DomainResponseItem]
@router.post("", response_model=List[DomainResponseItem])
async def add_authorized_domain(
    domain_request: DomainRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Add a domain to the current user's list of authorized domains.
    """
    user_id = current_user.get("id")
    domain_to_add = domain_request.domain.strip().lower() # Normalize domain

    if not domain_to_add:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Domain name cannot be empty")

    # Basic validation (can be enhanced)
    if "." not in domain_to_add or " " in domain_to_add:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid domain format")

    user_collection = await get_user_collection()
    user_doc = await user_collection.find_one({"id": user_id})
    if not user_doc:
         # Should not happen if dependency works
         logger.error(f"User {user_id} authenticated but not found in DB for domain add.")
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    current_domains_list = user_doc.get("domain_whitelist", [])

    if domain_to_add in current_domains_list:
        logger.info(f"Domain '{domain_to_add}' already exists for user {user_id}")
        # Return current list in the new format
        response_data = [{"id": domain, "domain_name": domain} for domain in current_domains_list]
        return response_data

    # --- Check subscription tier limits ---
    # TODO: Refactor this limit logic into a configuration or service
    tier_str = user_doc.get("subscription_tier", "free")
    try:
        tier = SubscriptionTier(tier_str)
    except ValueError:
        logger.warning(f"Invalid tier '{tier_str}' for user {user_id}, defaulting to free limits.")
        tier = SubscriptionTier.FREE

    # Define limits per tier
    if tier == SubscriptionTier.FREE:
        max_domains = 3 # Keep free tier limit low
    elif tier == SubscriptionTier.BASIC:
        max_domains = 5
    elif tier == SubscriptionTier.PREMIUM:
        max_domains = 15
    elif tier == SubscriptionTier.ENTERPRISE:
        max_domains = 50 # Set Enterprise limit
    else: # Fallback for safety, although should not happen with Enum
        max_domains = 3

    if len(current_domains_list) >= max_domains:
        logger.warning(f"User {user_id} (Tier: {tier.value}) tried to add domain '{domain_to_add}' but reached limit ({max_domains})")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum number of domains ({max_domains}) reached for your '{tier.value}' plan."
        )
    # --- End Limit Check ---

    # Add domain using $addToSet to prevent duplicates even with race conditions
    update_result = await user_collection.update_one(
        {"id": user_id},
        {"$addToSet": {"domain_whitelist": domain_to_add}}
    )

    if update_result.modified_count > 0:
        logger.info(f"Added domain '{domain_to_add}' for user {user_id}")
        current_domains_list.append(domain_to_add) # Update local list to return
    else:
        # This might happen if domain was added between find_one and update_one
        logger.info(f"Domain '{domain_to_add}' likely added concurrently for user {user_id}")
        # Re-fetch to be sure
        updated_user_doc = await user_collection.find_one({"id": user_id})
        current_domains_list = updated_user_doc.get("domain_whitelist", []) if updated_user_doc else current_domains_list

    # Return updated list in the new format
    response_data = [{"id": domain, "domain_name": domain} for domain in current_domains_list]
    return response_data

# Return type changed to List[DomainResponseItem]
# Use :path converter to allow slashes in the domain name
@router.delete("/{domain_name:path}", response_model=List[DomainResponseItem])
async def remove_authorized_domain(
    domain_name: str, # Domain from path
    current_user: Dict = Depends(get_current_user)
):
    """
    Remove an authorized domain for the current user.
    """
    user_id = current_user.get("id")
    # Manually decode the domain name received from the path parameter
    decoded_domain_name = unquote(domain_name)
    domain_to_remove = decoded_domain_name.strip().lower() # Normalize

    if not domain_to_remove:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid domain name provided")

    user_collection = await get_user_collection()

    # Fetch the user document first to handle potential scheme mismatches
    user_doc = await user_collection.find_one({"id": user_id})
    if not user_doc:
        # Should not happen if dependency works
        logger.error(f"User {user_id} authenticated but not found in DB for domain removal.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    current_domains_list = user_doc.get("domain_whitelist", [])
    original_length = len(current_domains_list)

    # Filter the list in Python to remove variations (with/without scheme)
    # Create variations to check against
    domain_variations = {
        domain_to_remove,
        domain_to_remove.replace("http://", ""),
        domain_to_remove.replace("https://", "")
    }
    # Also add variations with http/https if the input didn't have them
    if not domain_to_remove.startswith(("http://", "https://")):
        domain_variations.add(f"http://{domain_to_remove}")
        domain_variations.add(f"https://{domain_to_remove}")

    # Filter out any matching variations (case-insensitive check just in case)
    filtered_domains = [
        domain for domain in current_domains_list
        if domain.strip().lower() not in {v.strip().lower() for v in domain_variations}
    ]

    new_length = len(filtered_domains)

    if new_length == original_length:
        logger.warning(f"Domain variations related to '{domain_to_remove}' not found for user {user_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found in authorized list")

    # Update the document with the filtered list
    update_result = await user_collection.update_one(
        {"id": user_id},
        {"$set": {"domain_whitelist": filtered_domains}}
    )

    # Check if update was acknowledged (optional, but good practice)
    if not update_result.acknowledged:
         logger.error(f"Failed to acknowledge domain list update for user {user_id}")
         # Decide if this should be a 500 error or just a warning
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update domain list")

    logger.info(f"Removed domain variations related to '{domain_to_remove}' for user {user_id}")
    # Fetch the updated list to return (or just use filtered_domains)
    # updated_user_doc = await user_collection.find_one({"id": user_id}) # Re-fetch if needed
    updated_domains_list = filtered_domains # Use the list we just created

    # Return updated list in the new format
    response_data = [{"id": domain, "domain_name": domain} for domain in updated_domains_list]
    return response_data
