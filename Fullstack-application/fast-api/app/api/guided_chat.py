# app/api/guided_chat.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.models.guided_chat import GuidedChatFlow, GuidedChatOption
from app.services.guided_chat_manager import GuidedChatManager, get_guided_chat_manager
from app.utils.logging_config import get_module_logger
# Import require_active_subscription for protected endpoints and SubscriptionTier for limit checks
# Also import verify_widget_origin for the public-facing endpoint
from app.utils.dependencies import get_current_user, require_active_subscription, verify_widget_origin
from app.models.user import SubscriptionTier # Import SubscriptionTier
from pydantic import ValidationError

logger = get_module_logger(__name__)
router = APIRouter()

@router.get("/guided-flows", response_model=List[GuidedChatFlow], name="widget:get-guided-flows") # Added name
async def get_all_guided_flows(
    # Use verify_widget_origin for widget authentication
    current_user: dict = Depends(verify_widget_origin),
    guided_chat_manager: GuidedChatManager = Depends(get_guided_chat_manager),
):
    """Retrieves all guided chat flows for the current user."""
    try:
        user_id = current_user["id"]
        flows = await guided_chat_manager.get_all_flows(user_id)
        logger.info(f"Retrieved all guided chat flows for user {user_id}: {len(flows)} flows")
        return flows
    except Exception as e:
        logger.error(f"Error retrieving all guided chat flows: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )

@router.get("/guided-flows/{flow_id}", response_model=GuidedChatFlow)
async def get_guided_flow(
    flow_id: str,
    # Use get_current_user for dashboard authentication
    current_user: dict = Depends(get_current_user),
    guided_chat_manager: GuidedChatManager = Depends(get_guided_chat_manager),
):
    """Retrieves a specific guided chat flow by ID."""
    try:
        user_id = current_user["id"]
        flow = await guided_chat_manager.get_flow(flow_id, user_id)
        if flow:
            logger.info(f"Retrieved guided chat flow with ID '{flow_id}' for user {user_id}")
            # Ensure options are properly sorted by order
            flow.options.sort(key=lambda x: x.order)

            # Format bot responses if they exist
            for option in flow.options:
                if option.bot_response:
                    if isinstance(option.bot_response, str):
                        option.bot_response = {
                            "text": option.bot_response,
                            "followUp": None,
                        }
                    elif (
                        isinstance(option.bot_response, dict)
                        and "text" not in option.bot_response
                    ):
                        option.bot_response = {
                            "text": str(option.bot_response),
                            "followUp": None,
                        }

            return flow
        else:
            logger.warning(f"Guided chat flow with ID '{flow_id}' not found for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Guided chat flow not found",
            )
    except Exception as e:
        logger.error(f"Error retrieving guided chat flow with ID '{flow_id}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )

@router.post("/guided-flows", response_model=GuidedChatFlow, status_code=status.HTTP_201_CREATED)
async def create_guided_flow(
    flow: GuidedChatFlow,
    # Use require_active_subscription for this endpoint
    current_user: dict = Depends(require_active_subscription),
    guided_chat_manager: GuidedChatManager = Depends(get_guided_chat_manager),
):
    """Creates a new guided chat flow (requires active subscription)."""
    try:
        user_id = current_user["id"]
        
        # Set the user_id for the flow
        flow_data = flow.model_dump()
        flow_data["user_id"] = user_id

        # --- Check Plan Limits ---
        tier_str = current_user.get("subscription_tier", "free").lower() # Convert to lowercase
        try:
            # Attempt to match the lowercase string to the enum value
            tier = SubscriptionTier(tier_str)
        except ValueError:
            logger.warning(f"Invalid or unknown tier '{tier_str}' for user {user_id}, applying free limits.")
            tier = SubscriptionTier.FREE # Default to free if tier is invalid or unknown
        
        logger.info(f"[Create Flow Check] User: {user_id}, Tier String from User Obj: '{current_user.get('subscription_tier', 'Not Found')}', Parsed Tier Enum: '{tier.value}'") # Detailed Log

        # Define limits (should match frontend/plan)
        limits = {
            SubscriptionTier.FREE: 0, # Assuming free tier cannot create flows
            SubscriptionTier.BASIC: 15,
            SubscriptionTier.PREMIUM: 25,
            SubscriptionTier.ENTERPRISE: 100,
        }
        max_flows = limits.get(tier, 0) # Default to 0 if tier not in limits

        current_flow_count = await guided_chat_manager.flows_collection.count_documents({"user_id": user_id})

        if current_flow_count >= max_flows:
            logger.warning(f"User {user_id} (Tier: {tier.value}) tried to create guided flow but reached limit ({max_flows})")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Maximum number of guided flows ({max_flows}) reached for your '{tier.value}' plan."
            )
        # --- End Plan Limits Check ---

        logger.info(f"Creating guided chat flow for user {user_id} (Current: {current_flow_count}, Limit: {max_flows})")
        await guided_chat_manager.validate_flow(flow_data) # Validate before create

        # Create a new GuidedChatFlow with the user_id
        flow_with_user = GuidedChatFlow(**flow_data)
        return await guided_chat_manager.create_flow(flow_with_user)
    except ValidationError as e:
        logger.error(f"Validation Error creating guided chat flow: {str(e)}")
        logger.error(f"Error details: {e.json()}")  # Log detailed error
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=e.errors()
        )
    except HTTPException as http_exc: # Catch HTTPException for validation errors from validate_flow
        logger.error(f"HTTP Exception creating guided chat flow: {str(http_exc)}")
        raise http_exc # Re-raise to send detailed error response
    except Exception as e:
        logger.error(f"Error creating guided chat flow: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )

@router.put("/guided-flows/{flow_id}", response_model=GuidedChatFlow)
async def update_guided_flow(
    flow_id: str,
    flow: GuidedChatFlow,
    # Use require_active_subscription for this endpoint
    current_user: dict = Depends(require_active_subscription),
    guided_chat_manager: GuidedChatManager = Depends(get_guided_chat_manager),
):
    """Updates a guided chat flow (requires active subscription)."""
    try:
        user_id = current_user["id"]
        
        # Ensure user_id is set correctly
        flow_data = flow.model_dump()
        flow_data["user_id"] = user_id
        
        logger.info(f"Updating guided chat flow with ID '{flow_id}' for user {user_id}")
        await guided_chat_manager.validate_flow(flow_data) # Validate before update

        # Ensure options are sorted by order before updating
        flow.options.sort(key=lambda x: x.order)

        # Check if flow exists and belongs to user
        existing_flow = await guided_chat_manager.flows_collection.find_one({
            "id": flow_id,
            "user_id": user_id
        })
        
        if existing_flow:
            update_data = flow_data
            await guided_chat_manager.flows_collection.update_one(
                {"id": flow_id, "user_id": user_id}, 
                {"$set": update_data}
            )
            
            # Clear cache for this flow
            cache_key = f"flow_{flow_id}_{user_id}"
            if cache_key in guided_chat_manager.cache:
                del guided_chat_manager.cache[cache_key]

            updated_flow = await guided_chat_manager.flows_collection.find_one({
                "id": flow_id,
                "user_id": user_id
            })
            
            logger.info(f"Successfully updated guided chat flow with ID: {flow_id}")
            return GuidedChatFlow(**updated_flow)
            
        logger.warning(f"Guided chat flow with ID '{flow_id}' not found for user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guided chat flow not found",
        )
    except ValidationError as e:
        logger.error(f"Validation Error updating guided chat flow: {str(e)}")
        logger.error(f"Error details: {e.json()}")  # Log detailed error
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=e.errors()
        )
    except HTTPException as http_exc: # Catch HTTPException for validation errors from validate_flow
        logger.error(f"HTTP Exception updating guided chat flow: {str(http_exc)}")
        raise http_exc # Re-raise to send detailed error response
    except Exception as e:
        logger.error(f"Error updating guided chat flow with ID '{flow_id}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )

@router.delete("/guided-flows/{flow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_guided_flow(
    flow_id: str,
    # Use require_active_subscription for this endpoint
    current_user: dict = Depends(require_active_subscription),
    guided_chat_manager: GuidedChatManager = Depends(get_guided_chat_manager),
):
    """Deletes a guided chat flow (requires active subscription)."""
    try:
        user_id = current_user["id"]
        logger.info(f"Deleting guided chat flow with ID '{flow_id}' for user {user_id}")
        
        # Add user_id check to deletion
        await guided_chat_manager.delete_flow(flow_id, user_id)
        return {"message": "Guided chat flow deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting guided chat flow with ID '{flow_id}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )

@router.put(
    "/guided-flows/{flow_id}/reorder/{option_id}/{new_order}",
    response_model=GuidedChatFlow,
)
async def reorder_options(
    flow_id: str,
    option_id: str,
    new_order: int,
    # Use require_active_subscription for this endpoint
    current_user: dict = Depends(require_active_subscription),
    guided_chat_manager: GuidedChatManager = Depends(get_guided_chat_manager),
):
    """Reorders options within a flow (requires active subscription)."""
    try:
        user_id = current_user["id"]
        logger.info(f"Reordering option '{option_id}' in flow '{flow_id}' to new order: {new_order} for user {user_id}")
        
        # Add user_id to reorder operation
        updated_flow = await guided_chat_manager.reorder_options(
            flow_id, option_id, new_order, user_id
        )
        
        if updated_flow:
            return updated_flow
        else:
            logger.warning(f"Flow '{flow_id}' or option '{option_id}' not found for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Flow or option not found"
            )
    except Exception as e:
        logger.error(f"Error reordering options in flow '{flow_id}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )

@router.get("/guided-flows/export")
async def export_guided_flows(
    # Use require_active_subscription for this endpoint
    current_user: dict = Depends(require_active_subscription),
    guided_chat_manager: GuidedChatManager = Depends(get_guided_chat_manager),
):
    """Exports all guided chat flows as a JSON file (requires active subscription)."""
    try:
        user_id = current_user["id"]
        logger.info(f"Exporting all guided chat flows for user {user_id}")
        
        # Add user_id to export operation
        flows_json = await guided_chat_manager.export_flows(user_id)
        return {"filename": "guided_chat_flows.json", "content": flows_json}
    except Exception as e:
        logger.error(f"Error exporting guided chat flows: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )

@router.post("/guided-flows/import")
async def import_guided_flows(
    flows_json: str,
    # Use require_active_subscription for this endpoint
    current_user: dict = Depends(require_active_subscription),
    guided_chat_manager: GuidedChatManager = Depends(get_guided_chat_manager),
):
    """Imports guided chat flows from a JSON file (requires active subscription)."""
    try:
        user_id = current_user["id"]
        logger.info(f"Importing guided chat flows for user {user_id}")
        
        # Add user_id to import operation
        result = await guided_chat_manager.import_flows(flows_json, user_id)
        return {"message": f"Successfully imported {result['imported']} flows", "details": result}
    except Exception as e:
        logger.error(f"Error importing guided chat flows: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
