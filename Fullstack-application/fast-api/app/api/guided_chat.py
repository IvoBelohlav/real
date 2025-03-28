# app/api/guided_chat.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.models.guided_chat import GuidedChatFlow, GuidedChatOption
from app.services.guided_chat_manager import GuidedChatManager, get_guided_chat_manager
from app.utils.logging_config import get_module_logger
from pydantic import ValidationError

logger = get_module_logger(__name__)
router = APIRouter()

@router.get("/guided-flows", response_model=List[GuidedChatFlow])
async def get_all_guided_flows(
    guided_chat_manager: GuidedChatManager = Depends(get_guided_chat_manager),
):
    """Retrieves all guided chat flows."""
    try:
        flows = await guided_chat_manager.get_all_flows()
        logger.info(f"Retrieved all guided chat flows: {flows}")
        return flows
    except Exception as e:
        logger.error(f"Error retrieving all guided chat flows: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )

@router.get("/guided-flows/{flow_id}", response_model=GuidedChatFlow)
async def get_guided_flow(
    flow_id: str,
    guided_chat_manager: GuidedChatManager = Depends(get_guided_chat_manager),
):
    """Retrieves a specific guided chat flow by ID."""
    try:
        flow = await guided_chat_manager.get_flow(flow_id)
        if flow:
            logger.info(f"Retrieved guided chat flow with ID '{flow_id}': {flow}")
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
            logger.warning(f"Guided chat flow with ID '{flow_id}' not found")
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
    guided_chat_manager: GuidedChatManager = Depends(get_guided_chat_manager),
):
    """Creates a new guided chat flow."""
    try:
        logger.info(f"Creating guided chat flow: {flow.model_dump_json()}")
        await guided_chat_manager.validate_flow(flow.model_dump()) # Validate before create
        return await guided_chat_manager.create_flow(flow)
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
    guided_chat_manager: GuidedChatManager = Depends(get_guided_chat_manager),
):
    """Updates a guided chat flow."""
    try:
        logger.info(f"Updating guided chat flow with ID '{flow_id}': {flow.model_dump_json()}")
        await guided_chat_manager.validate_flow(flow.model_dump()) # Validate before update

        # Ensure options are sorted by order before updating
        flow.options.sort(key=lambda x: x.order)

        existing_flow = await guided_chat_manager.flows_collection.find_one({"id": flow_id}) # Access collection via manager
        if existing_flow:
            update_data = flow.model_dump(exclude_unset=True)
            await guided_chat_manager.flows_collection.update_one( # Access collection via manager
                {"id": flow_id}, {"$set": update_data}
            )
            # Clear cache for this flow
            cache_key = f"flow_{flow_id}"
            if cache_key in guided_chat_manager.cache: # Access cache via manager
                del guided_chat_manager.cache[cache_key] # Access cache via manager

            updated_flow = await guided_chat_manager.flows_collection.find_one({"id": flow_id}) # Access collection via manager
            logger.info(f"Successfully updated guided chat flow with ID: {flow_id}")
            return GuidedChatFlow(**updated_flow)
        logger.warning(f"Guided chat flow with ID '{flow_id}' not found")
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
    guided_chat_manager: GuidedChatManager = Depends(get_guided_chat_manager),
):
    """Deletes a guided chat flow."""
    try:
        logger.info(f"Deleting guided chat flow with ID '{flow_id}'")
        await guided_chat_manager.delete_flow(flow_id)
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
    guided_chat_manager: GuidedChatManager = Depends(get_guided_chat_manager),
):
    """Reorders options within a flow."""
    try:
        logger.info(f"Reordering option '{option_id}' in flow '{flow_id}' to new order: {new_order}")
        updated_flow = await guided_chat_manager.reorder_options(
            flow_id, option_id, new_order
        )
        if updated_flow:
            return updated_flow
        else:
            logger.warning(f"Flow '{flow_id}' or option '{option_id}' not found")
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
    guided_chat_manager: GuidedChatManager = Depends(get_guided_chat_manager),
):
    """Exports all guided chat flows as a JSON file."""
    try:
        logger.info("Exporting all guided chat flows")
        flows_json = await guided_chat_manager.export_flows()
        return {"filename": "guided_chat_flows.json", "content": flows_json}
    except Exception as e:
        logger.error(f"Error exporting guided chat flows: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )

@router.post("/guided-flows/import")
async def import_guided_flows(
    flows_json: str,
    guided_chat_manager: GuidedChatManager = Depends(get_guided_chat_manager),
):
    """Imports guided chat flows from a JSON string."""
    try:
        logger.info("Importing guided chat flows from JSON string")
        await guided_chat_manager.import_flows(flows_json)
        return {"message": "Guided chat flows imported successfully"}
    except HTTPException as e:
        logger.error(f"HTTPException during import: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Error importing guided chat flows: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )