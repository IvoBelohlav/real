from pydantic import BaseModel, Field, model_validator, ConfigDict
from typing import Optional, Dict, Any, List, Union
from datetime import datetime
from decimal import Decimal
import uuid
from bson import ObjectId
from fastapi import UploadFile

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return str(v)
        elif isinstance(v, str):
            try:
                ObjectId(v)
                return v
            except Exception:
                raise ValueError("Invalid ObjectId")
        raise ValueError("Invalid ObjectId")


class ModelConfig:
    """Pydantic general config"""
    model_config = ConfigDict(
        validate_assignment=True,
        from_attributes=True,
        arbitrary_types_allowed=True,
        json_encoders={
            ObjectId: str
        }
    )


class PriceInfo(BaseModel):
    """Simplified price information model"""
    one_time: Optional[Union[Decimal, float, str]] = None
    monthly: Optional[Union[Decimal, float, str]] = None
    annual: Optional[Union[Decimal, float, str]] = None
    currency: str = "Kč"

    @model_validator(mode='after')
    def handle_string_values(self):
        # Convert string representations to Decimal if needed
        if isinstance(self.one_time, str) and self.one_time:
            try:
                self.one_time = Decimal(self.one_time.replace(' ', '').replace(',', '.'))
            except (ValueError, TypeError):
                pass
                
        if isinstance(self.monthly, str) and self.monthly:
            try:
                self.monthly = Decimal(self.monthly.replace(' ', '').replace(',', '.'))
            except (ValueError, TypeError):
                pass
                
        if isinstance(self.annual, str) and self.annual:
            try:
                self.annual = Decimal(self.annual.replace(' ', '').replace(',', '.'))
            except (ValueError, TypeError):
                pass
        
        return self


# Simplified - just handle string vs int conversion for availability
class StockInfo(BaseModel):
    """Minimal stock information with flexible availability field"""
    quantity: Optional[int] = None
    availability: Optional[Union[int, str]] = None
    status: Optional[str] = None


class ProductBase(BaseModel):
    """Simplified base product model"""
    product_name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    category: str = Field(..., min_length=1, max_length=100)
    business_type: str = Field(..., description="Type of business")
    features: List[str] = Field(default_factory=list)
    pricing: PriceInfo = Field(default_factory=PriceInfo)
    target_audience: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    url: Optional[str] = None
    image_url: Optional[str] = None
    stock_information: Optional[StockInfo] = None
    admin_priority: int = Field(default=0, ge=0, le=10)

    @model_validator(mode='after')
    def ensure_admin_priority_is_int(self):
        # Convert admin_priority to int if it's a string
        if isinstance(self.admin_priority, str):
            try:
                self.admin_priority = int(self.admin_priority)
            except (ValueError, TypeError):
                self.admin_priority = 0
        return self

    class Config:
        from_attributes = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat(),
            Decimal: lambda v: float(v)
        }


class ProductCreate(ProductBase):
    """Model for creating new products"""
    image_file: Optional[UploadFile] = None
    model_config = ModelConfig.model_config


class ProductUpdate(BaseModel):
    """Simplified model for updating products"""
    product_name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=2000)
    features: Optional[List[str]] = None
    pricing: Optional[PriceInfo] = None
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    business_type: Optional[str] = None
    target_audience: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    url: Optional[str] = None
    image_url: Optional[str] = None
    image_file: Optional[UploadFile] = None
    admin_priority: Optional[int] = Field(None, ge=0, le=10)
    stock_information: Optional[StockInfo] = None

    class Config:
        arbitrary_types_allowed = True
        extra = "allow"


class Product(ProductBase):
    """Complete product model with system fields"""
    id: str = Field(...)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = Field(default=1, description="Product version for tracking changes")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            Decimal: lambda v: float(v) if v is not None else None
        }