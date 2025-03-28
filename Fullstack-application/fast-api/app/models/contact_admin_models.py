# app/models/contact_admin_models.py
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ContactSubmissionModel(BaseModel):
    email: str = Field(...)
    phone: Optional[str] = Field(None)
    message: str = Field(...)
    submittedAt: datetime = Field(default_factory=datetime.utcnow)
    completed: bool = Field(default=False)  # New field to track completion status

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "phone": "123-456-7890",
                "message": "I have a question about your products.",
                "submittedAt": "2024-07-27T10:00:00Z",
                "completed": False
            }
        }