from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, List
from datetime import datetime, timezone
from enum import Enum

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    TRIALING = "trialing"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    UNPAID = "unpaid"
    INACTIVE = "inactive"

class SubscriptionTier(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"
    ADMIN = "admin"

class User(BaseModel):
    id: str
    username: str
    email: EmailStr
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    usage: Optional[Dict[str, int]] = Field(default_factory=dict)
    subscription_tier: SubscriptionTier = Field(default=SubscriptionTier.FREE)
    
    # New fields for SaaS functionality
    api_key: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    subscription_status: Optional[SubscriptionStatus] = None
    subscription_end_date: Optional[datetime] = None
    domain_whitelist: Optional[List[str]] = Field(default_factory=list)
    company_name: Optional[str] = None
    is_email_verified: bool = False
    verification_token: Optional[str] = None
    reset_password_token: Optional[str] = None
    reset_password_expires: Optional[datetime] = None

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    company_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    id: str
    username: str
    email: EmailStr
    company_name: Optional[str] = None
    subscription_tier: SubscriptionTier
    subscription_status: Optional[SubscriptionStatus] = None
    subscription_end_date: Optional[datetime] = None
    api_key: Optional[str] = None
    created_at: datetime

class UserUpdate(BaseModel):
    username: Optional[str] = None
    company_name: Optional[str] = None
    domain_whitelist: Optional[List[str]] = None