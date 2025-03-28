# app/models/knowledge.py
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any, Union
from datetime import datetime

class Product(BaseModel):
    """Model for product data"""
    id: str
    product_name: str
    description: Optional[str] = None
    category: Optional[str] = None  
    business_type: Optional[str] = None
    features: List[str] = Field(default_factory=list)
    pricing: Dict[str, Any] = Field(default_factory=dict)
    technical_specifications: Dict[str, Any] = Field(default_factory=dict)
    image_url: Optional[str] = None
    url: Optional[str] = None
    admin_priority: int = 0
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    keywords: List[str] = Field(default_factory=list)
    custom_attributes: Dict[str, Any] = Field(default_factory=dict)

class CategoryInfo(BaseModel):
    """Model for category information"""
    name: str
    description: Optional[str] = None
    synonyms: List[str] = Field(default_factory=list)
    parent_category: Optional[str] = None
    subcategories: List[str] = Field(default_factory=list)
    featured: bool = False
    priority: int = 0

class ResponseTemplate(BaseModel):
    """Model for response templates"""
    intent: str
    template: str
    language: str = "cs"
    variables: List[str] = Field(default_factory=list)
    context_requirements: List[str] = Field(default_factory=list)

class CommonPhrase(BaseModel):
    """Model for common phrases"""
    key: str
    content: str
    language: str = "cs"
    tags: List[str] = Field(default_factory=list)

class KnowledgeItem(BaseModel):
    """Model for a generic knowledge base item"""
    id: str
    type: str  # product, category, template, phrase
    content: Dict[str, Any]
    language: str = "cs"
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    active: bool = True

class EntityAnalysis(BaseModel):
    """Model for entity analysis results"""
    products: List[str] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list) 
    features: List[str] = Field(default_factory=list)
    price_range: Dict[str, Optional[float]] = Field(
        default_factory=lambda: {"min": None, "max": None}
    )
    comparison: bool = False

class QueryAnalysis(BaseModel):
    """Model for query analysis results"""
    intent: str
    entities: EntityAnalysis = Field(default_factory=EntityAnalysis)
    confidence: float = 0.0
    query_type: str = "general_question"