# app/models/widget_faq_models.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class WidgetFAQItem(BaseModel):
    id: str
    question: str
    answer: str
    keywords: List[str] = Field(default_factory=list)
    category: Optional[str] = None
    language: str = "cs"  # Default language
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    active: bool = True  # Ensure active has a default of True
    show_in_widget: bool = True  # Default to True for widget FAQs
    widget_order: Optional[int] = None
    frequency: int = 0
    source: Optional[str] = None
    full_content: Optional[str] = None

class WidgetFAQCreate(BaseModel):
    question: str
    answer: str
    keywords: List[str] = Field(default_factory=list)
    category: Optional[str] = None
    language: str = "cs"  # Default language
    show_in_widget: bool = True  # Default to True for widget FAQs
    widget_order: Optional[int] = None
    active: bool = True # Add default value for active field