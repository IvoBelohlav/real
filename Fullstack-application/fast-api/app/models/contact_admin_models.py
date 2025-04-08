# app/models/contact_admin_models.py
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ContactSubmissionModel(BaseModel):
    email: str = Field(...)
    phone: Optional[str] = Field(None)
    message: str = Field(...)
    request_type: Optional[str] = Field(None)  # Added: e.g., 'order_status', 'item_return', 'general_question'
    order_number: Optional[str] = Field(None)  # Added: Optional order number
    submittedAt: datetime = Field(default_factory=datetime.utcnow)
    completed: bool = Field(default=False)  # Existing field to track completion status

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "phone": "123-456-7890",
                "message": "I have a question about your products.",
                "request_type": "general_question",
                "order_number": None,
                "submittedAt": "2024-07-27T10:00:00Z",
                "completed": False
            }
        }
