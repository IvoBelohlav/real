# app/models/shop_info.py
from pydantic import BaseModel, Field, EmailStr, HttpUrl, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
from bson import ObjectId

class Address(BaseModel):
    """Physical address model for store locations"""
    street: str = Field(..., min_length=1, max_length=200)
    city: str = Field(..., min_length=1, max_length=100)
    postal_code: str = Field(..., min_length=1, max_length=20)
    country: str = Field(..., min_length=1, max_length=100)
    is_headquarters: bool = False
    opening_hours: Optional[Dict[str, str]] = None  # e.g. {"monday": "9:00-17:00"}
    phone: Optional[str] = None
    email: Optional[str] = None
    maps_url: Optional[HttpUrl] = None

class SocialMedia(BaseModel):
    """Social media profile model"""
    platform: str = Field(..., min_length=1, max_length=50)
    url: HttpUrl = Field(...)
    username: Optional[str] = None
    display_name: Optional[str] = None

class AboutSection(BaseModel):
    """About us section with multiple paragraphs"""
    title: str = Field(..., min_length=1, max_length=200)
    paragraphs: List[str] = Field(...)
    image_url: Optional[HttpUrl] = None

class ShopInfo(BaseModel):
    """
    Complete shop information model with all details the AI might need
    to answer customer questions
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    shop_name: str = Field(..., min_length=1, max_length=200)
    legal_name: Optional[str] = Field(None, max_length=200)
    tagline: Optional[str] = Field(None, max_length=200)
    description_short: str = Field(..., max_length=500)
    description_long: str = Field(..., max_length=5000)
    
    # Contact information
    primary_email: EmailStr
    support_email: Optional[EmailStr] = None
    sales_email: Optional[EmailStr] = None
    
    primary_phone: str
    support_phone: Optional[str] = None
    sales_phone: Optional[str] = None
    
    # Website information
    website: HttpUrl
    founded_year: int
    
    # Address and social media
    addresses: List[Address] = Field(default_factory=list)
    social_media: List[SocialMedia] = Field(default_factory=list)
    
    # About sections (history, mission, team, etc.)
    about_sections: List[AboutSection] = Field(default_factory=list)
    
    # Business details
    business_hours: Dict[str, str] = Field(default_factory=dict)  # e.g. {"monday": "9:00-17:00"}
    business_type: str = Field(..., max_length=100)
    services: List[str] = Field(default_factory=list)
    
    # Shipping, payment, and returns policies
    shipping_policy: Optional[str] = None
    payment_methods: List[str] = Field(default_factory=list)
    return_policy: Optional[str] = None
    warranty_info: Optional[str] = None
    
    # SEO and metadata
    keywords: List[str] = Field(default_factory=list)
    
    # System fields
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    language: str = "cs"  # Default language
    
    # Special fields for AI use
    ai_prompt_summary: str = Field(..., max_length=1000, description="Concise summary used in AI system prompts")
    ai_faq_facts: List[str] = Field(default_factory=list, description="Key facts for AI to use in responses")
    ai_voice_style: Optional[str] = Field(None, max_length=500, description="Guidance on shop's voice and tone")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "shop_name": "DvojkavIT",
                "legal_name": "DvojkavIT s.r.o.",
                "tagline": "Digitální řešení s vizí",
                "description_short": "Nová generace digitálních tvůrců, která vznikla v roce 2024.",
                "description_long": "Jsme DvojkavIT, nová generace digitálních tvůrců, která vznikla v roce 2024. Spojuje nás vášeň pro online svět a touha dělat věci jinak, lépe.",
                "primary_email": "info@dvojkavit.com",
                "primary_phone": "+420 123 456 789",
                "website": "https://www.dvojkavit.com",
                "founded_year": 2024,
                "business_type": "Digital Agency",
                "ai_prompt_summary": "DvojkavIT je agentura založená v roce 2024, specializující se na webové stránky a e-shopy na míru.",
                "ai_faq_facts": [
                    "DvojkavIT byla založena v roce 2024",
                    "Specializujeme se na webové stránky a e-shopy na míru",
                    "Nabízíme služby v oblasti digitálního marketingu"
                ]
            }
        }
    )

class ShopInfoUpdate(BaseModel):
    """Model for updating shop information"""
    shop_name: Optional[str] = Field(None, min_length=1, max_length=200)
    legal_name: Optional[str] = Field(None, max_length=200)
    tagline: Optional[str] = Field(None, max_length=200)
    description_short: Optional[str] = Field(None, max_length=500)
    description_long: Optional[str] = Field(None, max_length=5000)
    
    # Contact information
    primary_email: Optional[EmailStr] = None
    support_email: Optional[EmailStr] = None
    sales_email: Optional[EmailStr] = None
    
    primary_phone: Optional[str] = None
    support_phone: Optional[str] = None
    sales_phone: Optional[str] = None
    
    # Website information
    website: Optional[HttpUrl] = None
    founded_year: Optional[int] = None
    
    # Address and social media
    addresses: Optional[List[Address]] = None
    social_media: Optional[List[SocialMedia]] = None
    
    # About sections
    about_sections: Optional[List[AboutSection]] = None
    
    # Business details
    business_hours: Optional[Dict[str, str]] = None
    business_type: Optional[str] = None
    services: Optional[List[str]] = None
    
    # Shipping, payment, and returns policies
    shipping_policy: Optional[str] = None
    payment_methods: Optional[List[str]] = None
    return_policy: Optional[str] = None
    warranty_info: Optional[str] = None
    
    # SEO and metadata
    keywords: Optional[List[str]] = None
    
    # Language
    language: Optional[str] = None
    
    # Special fields for AI use
    ai_prompt_summary: Optional[str] = None
    ai_faq_facts: Optional[List[str]] = None
    ai_voice_style: Optional[str] = None

    model_config = ConfigDict(extra="ignore")