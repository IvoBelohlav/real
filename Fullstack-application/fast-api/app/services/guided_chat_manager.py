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

    async def get_all_flows(self) -> List[GuidedChatFlow]:
        """Retrieves all guided chat flows."""
        logger.info("Retrieving all guided chat flows")
        flows = await self.flows_collection.find().to_list(length=None)
        return [GuidedChatFlow(**flow) for flow in flows]

    async def get_flow(self, flow_id: str) -> Optional[GuidedChatFlow]:
        """Retrieves a specific guided chat flow by ID."""
        logger.info(f"Retrieving guided chat flow with ID: {flow_id}")
        flow = await self.get_flow_with_cache(flow_id)
        if flow:
            return GuidedChatFlow(**flow)
        return None

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

    async def delete_flow(self, flow_id: str):
        """Deletes a guided chat flow."""
        logger.info(f"Deleting guided chat flow with ID: {flow_id}")
        await self.flows_collection.delete_one({"id": flow_id})
        # Clear cache for this flow
        cache_key = f"flow_{flow_id}"
        if cache_key in self.cache:
            del self.cache[cache_key]
        logger.info(f"Successfully deleted guided chat flow with ID: {flow_id}")

    async def reorder_options(self, flow_id: str, option_id: str, new_order: int) -> Optional[GuidedChatFlow]:
        """Reorders options within a flow."""
        logger.info(f"Reordering option '{option_id}' in flow '{flow_id}' to new order: {new_order}")
        flow = await self.flows_collection.find_one({"id": flow_id})
        if not flow:
            logger.warning(f"Flow '{flow_id}' not found")
            return None

        options = flow.get("options", [])
        option_to_move = next((opt for opt in options if opt["id"] == option_id), None)
        if not option_to_move:
            logger.warning(f"Option '{option_id}' not found in flow '{flow_id}'")
            return None

        options.remove(option_to_move)
        options.insert(new_order, option_to_move)

        # Update order values for each option
        for index, option in enumerate(options):
            option["order"] = index

        await self.flows_collection.update_one(
            {"id": flow_id}, {"$set": {"options": options}}
        )
        updated_flow = await self.flows_collection.find_one({"id": flow_id})
        logger.info(f"Successfully reordered option '{option_id}' in flow '{flow_id}'")
        return GuidedChatFlow(**updated_flow)

    async def export_flows(self) -> str:
        """Exports all flows as a JSON string."""
        logger.info("Exporting all guided chat flows")
        flows = await self.flows_collection.find().to_list(length=None)
        return json.dumps(flows, indent=2, default=str)

    async def import_flows(self, flows_json: str):
        """Imports flows from a JSON string."""
        logger.info("Importing guided chat flows from JSON string")
        try:
            flows = json.loads(flows_json)
            for flow in flows:
                await self.validate_flow(flow)
            await self.flows_collection.insert_many(flows)
            logger.info("Successfully imported guided chat flows")
        except Exception as e:
            logger.error(f"Error importing guided chat flows: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid flow data: {str(e)}")

# Dependency
async def get_guided_chat_manager(db: AsyncIOMotorClient = Depends(get_db)) -> GuidedChatManager:
    manager = GuidedChatManager(db)
    await manager.initialize_collections()
    return manager