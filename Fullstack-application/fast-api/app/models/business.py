from pydantic import BaseModel, Field
from typing import List, Optional

class BusinessType(BaseModel):
    """Simplified configuration for a business type, focusing on product comparison."""
    id: Optional[str] = Field(None, alias="_id", description="MongoDB document ID") # Added for response consistency
    user_id: Optional[str] = Field(None, description="ID of the user who owns this configuration") # Added for response consistency
    type: str = Field(..., description="Name/Type of the business (e.g., 'Electronics Shop', 'Bookstore')")
    key_features: List[str] = Field(default_factory=list, description="List of key features used for product comparison (e.g., 'Screen Size', 'RAM', 'Author').")
    comparison_metrics: List[str] = Field(default_factory=list, description="List of metrics used for product comparison (e.g., 'Price', 'Rating', 'Page Count').")

    class Config:
        populate_by_name = True # Allows using alias "_id"
        json_schema_extra = {
            "example": {
                "id": "605c72ef1f8d3b001c8e4d2a",
                "user_id": "user_123",
                "type": "Electronics Shop",
                "key_features": ["Screen Size", "RAM", "Storage", "Processor"],
                "comparison_metrics": ["Price", "Customer Rating", "Battery Life (hours)"]
            }
        }
