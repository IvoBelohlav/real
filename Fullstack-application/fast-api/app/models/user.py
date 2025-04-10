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
    # ADMIN tier removed as requested/implied

class User(BaseModel):
    id: str
    username: str
    email: EmailStr
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    usage: Optional[Dict[str, int]] = Field(default_factory=dict)
    subscription_tier: SubscriptionTier = Field(default=SubscriptionTier.FREE) # Default to FREE tier
    
    # New fields for SaaS functionality
    api_key: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    subscription_status: SubscriptionStatus = Field(default=SubscriptionStatus.INACTIVE) # Default to INACTIVE status
    subscription_end_date: Optional[datetime] = None
    domain_whitelist: Optional[List[str]] = Field(default_factory=list)
    company_name: Optional[str] = None
    is_email_verified: bool = False
    verification_token: Optional[str] = None
    reset_password_token: Optional[str] = None
    reset_password_expires: Optional[datetime] = None
    business_id: Optional[str] = None # Added for multi-tenancy
    is_super_admin: bool = False # Added flag for super admins

    # Fields for monthly usage tracking (e.g., conversations)
    conversation_count_current_month: int = Field(default=0)
    usage_period_start_date: Optional[datetime] = None

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
    subscription_tier: SubscriptionTier # The enum value (e.g., basic, premium)
    subscription_tier_name: str # User-friendly display name (e.g., Basic, Premium)
    subscription_status: SubscriptionStatus # Reflects the activity status
    subscription_end_date: Optional[datetime] = None
    api_key: Optional[str] = None
    created_at: datetime
    is_super_admin: bool = False # Added for super admin view

class UserUpdate(BaseModel):
    username: Optional[str] = None
    company_name: Optional[str] = None
    # domain_whitelist is NOT updatable via this endpoint for now
    # domain_whitelist: Optional[List[str]] = None
class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
