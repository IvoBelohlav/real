# app/api/contact_admin_api.py
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from app.utils import mongo
from app.models.contact_admin_models import ContactSubmissionModel
from app.utils.logging_config import get_module_logger
from bson import ObjectId

logger = get_module_logger(__name__)

router = APIRouter()

@router.post("/contact-admin/", response_model=ContactSubmissionModel, name="widget:create-contact-submission")
async def create_contact_submission(submission: ContactSubmissionModel):
    """
    Endpoint for users to submit contact admin form data.
    """
    logger.debug("ContactAdminAPI - create_contact_submission - Endpoint Hit")
    try:
        submission_dict = submission.model_dump()
        logger.debug(f"ContactAdminAPI - create_contact_submission - Submission Data: {submission_dict}")
        created_submission = await mongo.create_contact_submission(submission_dict)
        return created_submission
    except Exception as e:
        logger.error(f"ContactAdminAPI - create_contact_submission - Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create contact submission: {e}")

# Changed response_model to Dict to avoid model validation issues
@router.get("/contact-admin-submissions/", response_model=List[Dict[str, Any]], name="admin:get-contact-submissions")
async def get_contact_submissions(skip: int = 0, limit: int = 100):
    """
    Endpoint for admin to retrieve all contact admin submissions.
    """
    is_admin_user = True  # Replace with your actual admin check logic

    if not is_admin_user:
        raise HTTPException(status_code=403, detail="Admin access required")
    try:
        submissions = await mongo.get_all_contact_submissions()
        logger.debug(f"API returning submissions: {submissions}")
        return submissions
    except Exception as e:
        logger.error(f"Error fetching submissions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch contact submissions: {e}")

@router.delete("/contact-admin-submissions/{submission_id}", response_model=dict, name="admin:delete-contact-submission")
async def delete_contact_submission(submission_id: str):
    """
    Endpoint for admin to delete a specific contact submission.
    """
    is_admin_user = True  # Replace with your actual admin check logic

    if not is_admin_user:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    logger.debug(f"Attempting to delete submission with ID: {submission_id}")
    
    try:
        success = await mongo.delete_contact_submission(submission_id)
        if not success:
            raise HTTPException(status_code=404, detail="Contact submission not found")
        return {"message": "Contact submission deleted successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"ContactAdminAPI - delete_contact_submission - Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete contact submission: {e}")

@router.put("/contact-admin-submissions/{submission_id}/status", response_model=dict, name="admin:update-contact-submission-status")
async def update_contact_submission_status(submission_id: str, completed: bool = Query(...)):
    """
    Endpoint for admin to update the completed status of a contact submission.
    """
    is_admin_user = True  # Replace with your actual admin check logic

    if not is_admin_user:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    logger.debug(f"Attempting to update submission status with ID: {submission_id} to completed={completed}")
    
    try:
        success = await mongo.update_contact_submission_status(submission_id, completed)
        if not success:
            raise HTTPException(status_code=404, detail="Contact submission not found")
        return {"message": "Contact submission status updated successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"ContactAdminAPI - update_contact_submission_status - Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update contact submission status: {e}")