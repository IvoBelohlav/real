# app/services/guided_chat_manager.py
import json
from typing import List, Optional
from fastapi import HTTPException, Depends

from app.models.guided_chat import GuidedChatFlow, GuidedChatOption
from app.utils.mongo import get_db, get_guided_chat_flows_collection
from app.utils.logging_config import get_module_logger
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import ValidationError

logger = get_module_logger(__name__)

class GuidedChatManager:
    def __init__(self, db: AsyncIOMotorClient):
        self.db = db
        self.flows_collection = None
        self.cache = {}

    async def initialize_collections(self):
        """Initialize collections after database connection is established."""
        self.flows_collection = await get_guided_chat_flows_collection()

    async def validate_flow(self, flow: dict) -> bool:
        """Validates a flow for circular references and other criteria."""
        logger.info(f"Validating flow: {flow.get('name', 'N/A')}")
        if not flow.get('name'):
            raise HTTPException(400, "Flow name is required")

        visited = set()

        async def check_cycle(flow_id):
            logger.debug(f"Checking for cycle in flow ID: {flow_id}")
            if flow_id in visited:
                logger.warning(f"Circular reference detected in flow ID: {flow_id}")
                return True
            visited.add(flow_id)
            current_flow = await self.flows_collection.find_one({"id": flow_id})
            if not current_flow:
                return False
            for option in current_flow.get('options', []):
                if option.get('next_flow') and await check_cycle(option['next_flow']):
                    return True
            visited.remove(flow_id)
            return False

        for option in flow.get('options', []):
            if option.get('next_flow') and await check_cycle(option['next_flow']):
                raise HTTPException(400, "Circular reference detected in flow options")

        logger.info(f"Flow validation successful for: {flow.get('name', 'N/A')}")
        return True

    async def get_flow_with_cache(self, flow_id: str):
        """Retrieves a flow by ID, using cache if available."""
        cache_key = f"flow_{flow_id}"
        if cache_key in self.cache:
            logger.info(f"Cache hit for flow ID: {flow_id}")
            return self.cache[cache_key]

        logger.info(f"Fetching flow with ID: {flow_id} from database")
        flow = await self.flows_collection.find_one({"id": flow_id})
        if flow:
            logger.info(f"Flow found: {flow_id}")
            self.cache[cache_key] = flow
        else:
            logger.warning(f"Flow not found: {flow_id}")
        return flow

    async def get_all_flows(self, user_id: str) -> List[GuidedChatFlow]:
        """Retrieves all guided chat flows for a specific user."""
        logger.info(f"Attempting to retrieve all guided chat flows for user_id: {user_id}")
        try:
            if self.flows_collection is None:
                logger.error("flows_collection is None in get_all_flows. Initializing.")
                await self.initialize_collections() # Attempt re-initialization
                if self.flows_collection is None:
                     logger.critical("Failed to initialize flows_collection even after attempt.")
                     raise HTTPException(status_code=500, detail="Database collection not initialized")

            logger.debug(f"Querying flows_collection for user_id: {user_id}")
            flows_cursor = self.flows_collection.find({"user_id": user_id})
            flows_list = await flows_cursor.to_list(length=None)
            logger.info(f"Found {len(flows_list)} raw flow documents for user {user_id}")

            validated_flows = []
            for i, flow_doc in enumerate(flows_list):
                try:
                    validated_flow = GuidedChatFlow(**flow_doc)
                    validated_flows.append(validated_flow)
                except ValidationError as e:
                    flow_name = flow_doc.get('name', f'Unknown Flow at index {i}')
                    logger.error(f"Pydantic validation failed for flow '{flow_name}' (ID: {flow_doc.get('id', 'N/A')}): {e}")
                    # Depending on requirements, you might skip invalid flows or raise an error
                    # For now, let's skip and log
                    continue 
                except Exception as e:
                    flow_name = flow_doc.get('name', f'Unknown Flow at index {i}')
                    logger.error(f"Unexpected error validating flow '{flow_name}' (ID: {flow_doc.get('id', 'N/A')}): {e}")
                    continue

            logger.info(f"Successfully validated {len(validated_flows)} flows for user {user_id}")
            return validated_flows
        except Exception as e:
            logger.error(f"Unexpected error during get_all_flows for user {user_id}: {e}", exc_info=True)
            # Re-raise as HTTPException to ensure proper 500 response
            raise HTTPException(status_code=500, detail=f"An internal error occurred while retrieving flows: {str(e)}")


    async def get_flow(self, flow_id: str, user_id: str) -> Optional[GuidedChatFlow]:
        """Retrieves a specific guided chat flow by ID for a specific user."""
        logger.info(f"Retrieving guided chat flow with ID: {flow_id}")
        flow = await self.get_flow_with_cache(flow_id)
        if flow:
            return GuidedChatFlow(**flow)
        return None
    
    # Add user_id parameter to get_flow call within create_flow if needed, 
    # although it seems get_flow_with_cache is used more often.
    # Let's also update get_flow to require user_id for consistency and security.
    async def get_flow_with_cache(self, flow_id: str, user_id: str):
        """Retrieves a flow by ID for a specific user, using cache if available."""
        cache_key = f"flow_{flow_id}_{user_id}" # Include user_id in cache key
        if cache_key in self.cache:
            logger.info(f"Cache hit for flow ID: {flow_id}, user: {user_id}")
            return self.cache[cache_key]

        logger.info(f"Fetching flow with ID: {flow_id} for user: {user_id} from database")
        # Add user_id to the find query
        flow = await self.flows_collection.find_one({"id": flow_id, "user_id": user_id}) 
        if flow:
            logger.info(f"Flow found: {flow_id} for user: {user_id}")
            self.cache[cache_key] = flow
        else:
            logger.warning(f"Flow not found: {flow_id} for user: {user_id}")
        return flow

    async def create_flow(self, flow: GuidedChatFlow) -> GuidedChatFlow:
        """Creates a new guided chat flow."""
        logger.info(f"Creating new guided chat flow: {flow.model_dump_json()}")
        await self.validate_flow(flow.model_dump())
        
        # Ensure options are sorted by order before saving
        flow.options.sort(key=lambda x: x.order)

        flow_dict = flow.model_dump()
        result = await self.flows_collection.insert_one(flow_dict)
        created_flow = await self.flows_collection.find_one({"_id": result.inserted_id})
        
        if created_flow:
            logger.info(f"Successfully created guided chat flow with ID: {created_flow.get('id')}")
            return GuidedChatFlow(**created_flow)
        else:
            logger.error("Failed to create guided chat flow.")
            raise HTTPException(status_code=500, detail="Failed to create guided chat flow")

    async def update_flow(self, flow_id: str, flow: GuidedChatFlow) -> Optional[GuidedChatFlow]:
        """Updates a guided chat flow."""
        logger.info(f"Updating guided chat flow with ID: {flow_id}")
        await self.validate_flow(flow.model_dump())

        # Ensure options are sorted by order before updating
        flow.options.sort(key=lambda x: x.order)

        existing_flow = await self.flows_collection.find_one({"id": flow_id})
        if existing_flow:
            update_data = flow.model_dump(exclude_unset=True)
            await self.flows_collection.update_one(
                {"id": flow_id}, {"$set": update_data}
            )
            # Clear cache for this flow
            cache_key = f"flow_{flow_id}"
            if cache_key in self.cache:
                del self.cache[cache_key]

            updated_flow = await self.flows_collection.find_one({"id": flow_id})
            logger.info(f"Successfully updated guided chat flow with ID: {flow_id}")
            return GuidedChatFlow(**updated_flow)
        logger.warning(f"Guided chat flow with ID '{flow_id}' not found")
        return None

    async def delete_flow(self, flow_id: str, user_id: str):
        """Deletes a guided chat flow for a specific user."""
        logger.info(f"Deleting guided chat flow with ID: {flow_id} for user: {user_id}")
        # Add user_id to the delete query
        result = await self.flows_collection.delete_one({"id": flow_id, "user_id": user_id})
        
        if result.deleted_count == 0:
             logger.warning(f"Attempted to delete non-existent or unauthorized flow ID: {flow_id} for user: {user_id}")
             raise HTTPException(status_code=404, detail="Flow not found or not authorized")

        # Clear cache for this flow for this user
        cache_key = f"flow_{flow_id}_{user_id}"
        if cache_key in self.cache:
            del self.cache[cache_key]
        logger.info(f"Successfully deleted guided chat flow with ID: {flow_id} for user: {user_id}")

    async def reorder_options(self, flow_id: str, option_id: str, new_order: int, user_id: str) -> Optional[GuidedChatFlow]:
        """Reorders options within a flow for a specific user."""
        logger.info(f"Reordering option '{option_id}' in flow '{flow_id}' to new order: {new_order} for user: {user_id}")
        # Add user_id to the find query
        flow = await self.flows_collection.find_one({"id": flow_id, "user_id": user_id})
        if not flow:
            logger.warning(f"Flow '{flow_id}' not found")
            logger.warning(f"Flow '{flow_id}' not found for user '{user_id}'")
            return None

        options = flow.get("options", [])
        option_to_move = next((opt for opt in options if opt["id"] == option_id), None)
        if not option_to_move:
            logger.warning(f"Option '{option_id}' not found in flow '{flow_id}' for user '{user_id}'")
            return None

        options.remove(option_to_move)
        # Ensure new_order is within bounds
        new_order = max(0, min(new_order, len(options)))
        options.insert(new_order, option_to_move)

        # Update order values for each option
        for index, option in enumerate(options):
            option["order"] = index

        await self.flows_collection.update_one(
            {"id": flow_id, "user_id": user_id}, {"$set": {"options": options}} # Add user_id to update query
        )
        # Fetch the updated flow again to ensure we return the latest state
        updated_flow = await self.flows_collection.find_one({"id": flow_id, "user_id": user_id})
        
        # Clear cache after update
        cache_key = f"flow_{flow_id}_{user_id}"
        if cache_key in self.cache:
            del self.cache[cache_key]
            
        logger.info(f"Successfully reordered option '{option_id}' in flow '{flow_id}' for user '{user_id}'")
        return GuidedChatFlow(**updated_flow) if updated_flow else None

    async def export_flows(self, user_id: str) -> str:
        """Exports all flows for a specific user as a JSON string."""
        logger.info(f"Exporting all guided chat flows for user: {user_id}")
        # Add user_id to the find query
        flows = await self.flows_collection.find({"user_id": user_id}).to_list(length=None)
        return json.dumps(flows, indent=2, default=str)

    async def import_flows(self, flows_json: str, user_id: str):
        """Imports flows from a JSON string for a specific user."""
        logger.info(f"Importing guided chat flows from JSON string for user: {user_id}")
        imported_count = 0
        skipped_count = 0
        errors = []
        
        try:
            flows_data = json.loads(flows_json)
            if not isinstance(flows_data, list):
                 raise ValueError("Import data must be a list of flows.")

            for flow_data in flows_data:
                if not isinstance(flow_data, dict):
                    logger.warning(f"Skipping invalid flow data item (not a dict): {flow_data}")
                    skipped_count += 1
                    continue
                
                # Ensure the flow belongs to the current user
                flow_data['user_id'] = user_id 
                
                try:
                    # Validate using Pydantic model first
                    GuidedChatFlow(**flow_data) 
                    # Then perform custom validation (e.g., circular refs)
                    await self.validate_flow(flow_data) 
                    
                    # Use update_one with upsert=True to avoid duplicates based on 'id' and 'user_id'
                    result = await self.flows_collection.update_one(
                        {"id": flow_data['id'], "user_id": user_id},
                        {"$set": flow_data},
                        upsert=True
                    )
                    if result.upserted_id or result.modified_count > 0:
                        imported_count += 1
                        # Clear cache for imported/updated flow
                        cache_key = f"flow_{flow_data['id']}_{user_id}"
                        if cache_key in self.cache:
                            del self.cache[cache_key]
                    else:
                         # This case might happen if the exact same flow already exists
                         logger.info(f"Flow with id {flow_data.get('id')} already exists and is identical. Skipping.")
                         skipped_count += 1

                except (ValidationError, HTTPException) as e:
                    error_detail = e.detail if isinstance(e, HTTPException) else e.errors()
                    logger.error(f"Validation Error importing flow '{flow_data.get('name', 'N/A')}': {error_detail}")
                    errors.append({"flow_name": flow_data.get('name', 'N/A'), "error": error_detail})
                    skipped_count += 1
                except Exception as e:
                    logger.error(f"Unexpected error importing flow '{flow_data.get('name', 'N/A')}': {str(e)}")
                    errors.append({"flow_name": flow_data.get('name', 'N/A'), "error": str(e)})
                    skipped_count += 1

            logger.info(f"Successfully processed import. Imported: {imported_count}, Skipped: {skipped_count}")
            return {"imported": imported_count, "skipped": skipped_count, "errors": errors}

        except json.JSONDecodeError as e:
            logger.error(f"Error decoding JSON during import: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")
        except ValueError as e:
             logger.error(f"Error during import: {str(e)}")
             raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"Unexpected error during import process: {str(e)}")
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred during import: {str(e)}")


# Dependency
async def get_guided_chat_manager(db: AsyncIOMotorClient = Depends(get_db)) -> GuidedChatManager:
    manager = GuidedChatManager(db)
    await manager.initialize_collections()
    return manager
