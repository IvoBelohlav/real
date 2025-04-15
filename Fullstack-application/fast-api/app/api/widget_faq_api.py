# app/api/widget_faq_api.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
import json
from bson import ObjectId

from app.models.widget_faq_models import WidgetFAQItem, WidgetFAQCreate
from app.utils.mongo import get_widget_faq_collection, serialize_mongo_doc
from app.utils.logging_config import get_module_logger
# Use verify_widget_origin for public endpoint, get_current_user for others
from app.utils.dependencies import verify_widget_origin, get_current_user 

router = APIRouter()
logger = get_module_logger(__name__)

async def get_widget_faq_items_collection(): # Dependency function to get widget_faq collection
    return await get_widget_faq_collection()

# Endpoint for the public widget to fetch FAQs
@router.get("/public/widget-faqs", response_model=List[WidgetFAQItem], name="public:get-widget-faqs", tags=["Public Widget"])
async def get_public_widget_faqs_endpoint(
    # Use the strict origin verification dependency
    current_user: dict = Depends(verify_widget_origin), 
    widget_faq_collection = Depends(get_widget_faq_items_collection)
):
    """
    Retrieve active widget FAQs for the user associated with the API key,
    validating the request origin.
    """
    """
    Retrieve all widget FAQs.
    """
    try:
        logger.debug("Fetching widget FAQs from database...")
        user_id = current_user["id"]
        
        # Construct the filter with user_id for multi-tenancy
        filter_criteria = {"active": True, "show_in_widget": True, "user_id": user_id}

        # Print the filter criteria to the console
        print(f"Filter criteria: {filter_criteria}")

        widget_faqs_cursor = widget_faq_collection.find(filter_criteria).sort(
            [("widget_order", 1), ("_id", 1)]
        )

        # DETAILED LOGGING BEFORE QUERY EXECUTION:
        logger.debug(f"Query filter being used: {json.dumps(filter_criteria)}")

        widget_faqs_raw = await widget_faqs_cursor.to_list(length=None)

        # LOG THE RAW DATA FROM MONGODB:
        logger.debug(f"Raw widget FAQs data from MongoDB: {widget_faqs_raw}")

        widget_faqs = [WidgetFAQItem(**serialize_mongo_doc(faq)) for faq in widget_faqs_raw]

        # LOG AFTER SERIALIZATION:
        logger.debug(f"Serialized widget FAQs: {widget_faqs}")

        logger.debug(f"Retrieved {len(widget_faqs)} widget FAQs.")
        return widget_faqs
    except Exception as e:
        logger.error(f"Error retrieving widget FAQs: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not retrieve widget FAQs")

# Endpoint for dashboard management (requires JWT auth)
@router.get("/manage/widget-faqs/{faq_id}", response_model=WidgetFAQItem, name="dashboard:get-widget-faq", tags=["Dashboard Management"])
async def get_widget_faq_by_id_for_management(
    faq_id: str, 
    # Use standard JWT authentication for dashboard
    current_user: dict = Depends(get_current_user), 
    widget_faq_collection = Depends(get_widget_faq_items_collection)
):
    """
    Retrieve a specific widget FAQ by ID.
    """
    try:
        logger.debug(f"Fetching widget FAQ with ID: {faq_id}")
        user_id = current_user["id"]
        
        # Convert string ID to ObjectId for MongoDB
        try:
            obj_id = ObjectId(faq_id)
        except Exception as e:
            logger.error(f"Invalid FAQ ID format: {faq_id}, error: {e}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid FAQ ID format")
        
        # Find the FAQ with user_id filter
        faq = await widget_faq_collection.find_one({"_id": obj_id, "user_id": user_id})
        
        if not faq:
            logger.error(f"FAQ not found for ID: {faq_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FAQ not found")
        
        # Serialize and log the result for debugging
        serialized_faq = serialize_mongo_doc(faq)
        logger.debug(f"Retrieved FAQ: {serialized_faq}")
        
        # Make sure the ID is properly set
        if "id" not in serialized_faq and "_id" in serialized_faq:
            serialized_faq["id"] = str(serialized_faq.pop("_id"))
        
        return WidgetFAQItem(**serialized_faq)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving widget FAQ: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not retrieve widget FAQ")

# Endpoint for dashboard management (requires JWT auth)
@router.post("/manage/widget-faqs", response_model=WidgetFAQItem, status_code=status.HTTP_201_CREATED, name="dashboard:create-widget-faq", tags=["Dashboard Management"])
async def create_widget_faq_for_management(
    widget_faq_create: WidgetFAQCreate, 
    # Use standard JWT authentication for dashboard
    current_user: dict = Depends(get_current_user), 
    widget_faq_collection = Depends(get_widget_faq_items_collection)
):
    """
    Create a new widget FAQ.
    """
    try:
        logger.debug(f"Creating new widget FAQ: {widget_faq_create}")
        user_id = current_user["id"]
        
        faq_data = widget_faq_create.model_dump()

        # Force active to be True and set user_id
        faq_data["active"] = True
        faq_data["user_id"] = user_id

        result = await widget_faq_collection.insert_one(faq_data)
        new_faq = await widget_faq_collection.find_one({"_id": result.inserted_id})
        if new_faq:
            return WidgetFAQItem(**serialize_mongo_doc(new_faq))
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create widget FAQ")
    except Exception as e:
        logger.error(f"Error creating widget FAQ: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create widget FAQ")

# Endpoint for dashboard management (requires JWT auth)
@router.put("/manage/widget-faqs/{faq_id}", response_model=WidgetFAQItem, name="dashboard:update-widget-faq", tags=["Dashboard Management"])
async def update_widget_faq_for_management(
    faq_id: str, 
    widget_faq_update: WidgetFAQCreate, 
    # Use standard JWT authentication for dashboard
    current_user: dict = Depends(get_current_user), 
    widget_faq_collection = Depends(get_widget_faq_items_collection)
):
    """
    Update an existing widget FAQ.
    """
    try:
        logger.debug(f"Updating widget FAQ with ID: {faq_id}")
        user_id = current_user["id"]
        
        # Convert string ID to ObjectId for MongoDB
        try:
            obj_id = ObjectId(faq_id)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid FAQ ID format")
        
        # Check if the FAQ exists and belongs to the user
        existing_faq = await widget_faq_collection.find_one({"_id": obj_id, "user_id": user_id})
        if not existing_faq:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FAQ not found")
        
        # Prepare update data
        update_data = widget_faq_update.model_dump()
        
        # Force active to be True and ensure user_id is set
        update_data["active"] = True
        update_data["user_id"] = user_id
        
        # Update the FAQ
        result = await widget_faq_collection.update_one(
            {"_id": obj_id, "user_id": user_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            # Get the updated FAQ
            updated_faq = await widget_faq_collection.find_one({"_id": obj_id})
            return WidgetFAQItem(**serialize_mongo_doc(updated_faq))
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update widget FAQ")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating widget FAQ: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update widget FAQ")

# Endpoint for dashboard management (requires JWT auth)
@router.delete("/manage/widget-faqs/{faq_id}", status_code=status.HTTP_204_NO_CONTENT, name="dashboard:delete-widget-faq", tags=["Dashboard Management"])
async def delete_widget_faq_for_management(
    faq_id: str, 
    # Use standard JWT authentication for dashboard
    current_user: dict = Depends(get_current_user), 
    widget_faq_collection = Depends(get_widget_faq_items_collection)
):
    """
    Delete a widget FAQ.
    """
    try:
        logger.debug(f"Deleting widget FAQ with ID: {faq_id}")
        user_id = current_user["id"]
        
        # Convert string ID to ObjectId for MongoDB
        try:
            obj_id = ObjectId(faq_id)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid FAQ ID format")
        
        # Check if the FAQ exists and belongs to the user
        existing_faq = await widget_faq_collection.find_one({"_id": obj_id, "user_id": user_id})
        if not existing_faq:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FAQ not found")
        
        # Delete the FAQ
        result = await widget_faq_collection.delete_one({"_id": obj_id, "user_id": user_id})
        
        if result.deleted_count > 0:
            return None
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete widget FAQ")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting widget FAQ: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete widget FAQ")
