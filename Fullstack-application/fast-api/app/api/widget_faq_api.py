# app/api/widget_faq_api.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
import json
from bson import ObjectId

from app.models.widget_faq_models import WidgetFAQItem, WidgetFAQCreate
from app.utils.mongo import get_widget_faq_collection, serialize_mongo_doc
from app.utils.logging_config import get_module_logger

router = APIRouter()
logger = get_module_logger(__name__)

async def get_widget_faq_items_collection(): # Dependency function to get widget_faq collection
    return await get_widget_faq_collection()

@router.get("/widget-faqs", response_model=List[WidgetFAQItem])
async def get_widget_faqs_endpoint(widget_faq_collection = Depends(get_widget_faq_items_collection)):
    """
    Retrieve all widget FAQs.
    """
    try:
        logger.debug("Fetching widget FAQs from database...")
        
        # Construct the filter
        filter_criteria = {"active": True, "show_in_widget": True}

        # Print the filter criteria to the console
        print(f"Filter criteria: {filter_criteria}")

        widget_faqs_cursor = widget_faq_collection.find(filter_criteria).sort(
            [("widget_order", 1), ("_id", 1)]
        )

        # DETAILED LOGGING BEFORE QUERY EXECUTION:
        logger.debug(f"Query filter being used: {json.dumps({'active': True, 'show_in_widget': True})}")

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

@router.get("/widget-faqs/{faq_id}", response_model=WidgetFAQItem)
async def get_widget_faq_by_id(faq_id: str, widget_faq_collection = Depends(get_widget_faq_items_collection)):
    """
    Retrieve a specific widget FAQ by ID.
    """
    try:
        logger.debug(f"Fetching widget FAQ with ID: {faq_id}")
        
        # Convert string ID to ObjectId for MongoDB
        try:
            obj_id = ObjectId(faq_id)
        except Exception as e:
            logger.error(f"Invalid FAQ ID format: {faq_id}, error: {e}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid FAQ ID format")
        
        # Find the FAQ
        faq = await widget_faq_collection.find_one({"_id": obj_id})
        
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

@router.post("/widget-faqs", response_model=WidgetFAQItem, status_code=status.HTTP_201_CREATED)
async def create_widget_faq(widget_faq_create: WidgetFAQCreate, widget_faq_collection = Depends(get_widget_faq_items_collection)):
    """
    Create a new widget FAQ.
    """
    try:
        logger.debug(f"Creating new widget FAQ: {widget_faq_create}")
        faq_data = widget_faq_create.model_dump()

        # Force active to be True:
        faq_data["active"] = True  # Add this line

        result = await widget_faq_collection.insert_one(faq_data)
        new_faq = await widget_faq_collection.find_one({"_id": result.inserted_id})
        if new_faq:
            return WidgetFAQItem(**serialize_mongo_doc(new_faq))
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create widget FAQ")
    except Exception as e:
        logger.error(f"Error creating widget FAQ: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create widget FAQ")

@router.put("/widget-faqs/{faq_id}", response_model=WidgetFAQItem)
async def update_widget_faq(faq_id: str, widget_faq_update: WidgetFAQCreate, widget_faq_collection = Depends(get_widget_faq_items_collection)):
    """
    Update an existing widget FAQ.
    """
    try:
        logger.debug(f"Updating widget FAQ with ID: {faq_id}")
        
        # Convert string ID to ObjectId for MongoDB
        try:
            obj_id = ObjectId(faq_id)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid FAQ ID format")
        
        # Check if the FAQ exists
        existing_faq = await widget_faq_collection.find_one({"_id": obj_id})
        if not existing_faq:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FAQ not found")
        
        # Prepare update data
        update_data = widget_faq_update.model_dump()
        
        # Force active to be True
        update_data["active"] = True
        
        # Update the FAQ
        result = await widget_faq_collection.update_one(
            {"_id": obj_id},
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

@router.delete("/widget-faqs/{faq_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_widget_faq(faq_id: str, widget_faq_collection = Depends(get_widget_faq_items_collection)):
    """
    Delete a widget FAQ.
    """
    try:
        logger.debug(f"Deleting widget FAQ with ID: {faq_id}")
        
        # Convert string ID to ObjectId for MongoDB
        try:
            obj_id = ObjectId(faq_id)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid FAQ ID format")
        
        # Check if the FAQ exists
        existing_faq = await widget_faq_collection.find_one({"_id": obj_id})
        if not existing_faq:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FAQ not found")
        
        # Delete the FAQ
        result = await widget_faq_collection.delete_one({"_id": obj_id})
        
        if result.deleted_count > 0:
            return None
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete widget FAQ")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting widget FAQ: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete widget FAQ")