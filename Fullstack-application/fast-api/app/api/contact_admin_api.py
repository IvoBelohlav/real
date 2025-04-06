# app/api/contact_admin_api.py
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Depends
from app.utils import mongo
from app.models.contact_admin_models import ContactSubmissionModel
from app.utils.logging_config import get_module_logger
# Import the new dependency and keep the old one for other endpoints for now
from app.utils.dependencies import get_current_active_customer, verify_widget_origin
from bson import ObjectId

logger = get_module_logger(__name__)

router = APIRouter()

@router.post("/contact-admin/", response_model=ContactSubmissionModel, name="widget:create-contact-submission")
async def create_contact_submission(
    submission: ContactSubmissionModel,
    # Use the stricter origin verification dependency for this widget endpoint
    current_user: dict = Depends(verify_widget_origin)
):
    """
    Endpoint for users to submit contact admin form data.
    """
    logger.debug("ContactAdminAPI - create_contact_submission - Endpoint Hit")
    try:
        # Add user_id to submission data
        user_id = current_user["id"]
        submission_dict = submission.model_dump()
        submission_dict["user_id"] = user_id
        
        logger.debug(f"ContactAdminAPI - create_contact_submission - Submission Data: {submission_dict}")
        created_submission = await mongo.create_contact_submission(submission_dict)
        return created_submission
    except Exception as e:
        logger.error(f"ContactAdminAPI - create_contact_submission - Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create contact submission: {e}")

# Changed response_model to Dict to avoid model validation issues
@router.get("/contact-admin-submissions/", response_model=List[Dict[str, Any]], name="admin:get-contact-submissions")
async def get_contact_submissions(
    current_user: dict = Depends(get_current_active_customer),
    skip: int = 0, 
    limit: int = 100
):
    """
    Endpoint to retrieve all contact admin submissions for the current user.
    """
    try:
        user_id = current_user["id"]
        submissions = await mongo.get_contact_submissions_by_user(user_id)
        logger.debug(f"API returning submissions for user {user_id}: {len(submissions)}")
        return submissions
    except Exception as e:
        logger.error(f"Error fetching submissions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch contact submissions: {e}")

@router.delete("/contact-admin-submissions/{submission_id}", response_model=dict, name="admin:delete-contact-submission")
async def delete_contact_submission(
    submission_id: str,
    current_user: dict = Depends(get_current_active_customer)
):
    """
    Endpoint to delete a specific contact submission.
    """
    user_id = current_user["id"]
    logger.debug(f"Attempting to delete submission with ID: {submission_id} for user {user_id}")
    
    try:
        # Add user_id check to deletion
        success = await mongo.delete_contact_submission(submission_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Contact submission not found")
        return {"message": "Contact submission deleted successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"ContactAdminAPI - delete_contact_submission - Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete contact submission: {e}")

@router.put("/contact-admin-submissions/{submission_id}/status", response_model=dict, name="admin:update-contact-submission-status")
async def update_contact_submission_status(
    submission_id: str,
    completed: bool = Query(...),
    current_user: dict = Depends(get_current_active_customer)
):
    """
    Endpoint to update the completed status of a contact submission.
    """
    user_id = current_user["id"]
    logger.debug(f"Attempting to update submission status with ID: {submission_id} to completed={completed} for user {user_id}")
    
    try:
        # Add user_id check to update
        success = await mongo.update_contact_submission_status(submission_id, completed, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Contact submission not found")
        return {"message": "Contact submission status updated successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"ContactAdminAPI - update_contact_submission_status - Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update contact submission status: {e}")
