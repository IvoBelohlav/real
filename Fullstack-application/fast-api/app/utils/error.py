# app/utils/error.py
from fastapi import HTTPException
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

class BusinessError(Exception):
    def __init__(self, message: str, business_type: str):
        self.message = message
        self.business_type = business_type
        super().__init__(self.message)

def handle_error(error: Exception, status_code: int = 500, message: str = None):
    if isinstance(error, BusinessError):
        status_code = 400
        message = f"Business error ({error.business_type}): {error.message}"
    logger.error(f"Error: {error}", exc_info=True)
    if not message:
        message = "Internal Server Error"
    raise HTTPException(status_code=status_code, detail=message)