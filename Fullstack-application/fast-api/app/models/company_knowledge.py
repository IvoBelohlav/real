# app/models/company_knowledge.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import uuid4

class CompanyKnowledge(BaseModel):
    """
    Model for company knowledge items such as materials, processes, 
    values, and other general information about the company.
    """
    knowledge_id: str = Field(default_factory=lambda: str(uuid4()))
    title: str
    content: str
    category: str  # e.g., 'materials', 'processes', 'values', 'history', 'team', 'certifications'
    subcategory: Optional[str] = None
    tags: List[str] = []
    images: List[str] = []  # URLs or references to images
    related_categories: List[str] = []  # Product categories related to this knowledge
    importance_level: int = 1  # 1-5 scale for importance (affects ranking in search results)
    author: Optional[str] = None
    language: str = "cs"  # Default to Czech
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    active: bool = True
    search_keywords: List[str] = []  # Additional keywords to help with search
    video_url: Optional[str] = None  # URL to a related video if available
    order: int = 0  # For manual ordering of knowledge items
    display_in_faq: bool = False  # Whether to display in FAQ section
    metadata: Dict[str, Any] = Field(default_factory=dict)  # Additional metadata
    
    class Config:
        json_schema_extra = {
            "example": {
                "knowledge_id": "k-123456",
                "title": "Materiály používané v našich produktech",
                "content": "Podrobný popis všech materiálů používaných v našich produktech...",
                "category": "materials",
                "subcategory": "raw_materials",
                "tags": ["materiály", "kvalita", "udržitelnost"],
                "related_categories": ["nábytek", "doplňky"],
                "importance_level": 3,
                "language": "cs",
                "search_keywords": ["z čeho je vyroben", "materiálové složení", "suroviny"]
            }
        }

class CompanyKnowledgeCreate(BaseModel):
    """Model for creating a new company knowledge item."""
    title: str
    content: str
    category: str
    subcategory: Optional[str] = None
    tags: List[str] = []
    images: List[str] = []
    related_categories: List[str] = []
    importance_level: int = 1
    author: Optional[str] = None
    language: str = "cs"
    search_keywords: List[str] = []
    video_url: Optional[str] = None
    order: int = 0
    display_in_faq: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)

class CompanyKnowledgeUpdate(BaseModel):
    """Model for updating an existing company knowledge item."""
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    tags: Optional[List[str]] = None
    images: Optional[List[str]] = None
    related_categories: Optional[List[str]] = None
    importance_level: Optional[int] = None
    author: Optional[str] = None
    search_keywords: Optional[List[str]] = None
    video_url: Optional[str] = None
    order: Optional[int] = None
    active: Optional[bool] = None
    display_in_faq: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None