from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class SubscriptionTier(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    TRIALING = "trialing"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    UNPAID = "unpaid"
    INACTIVE = "inactive"

class CreateCheckoutSessionRequest(BaseModel):
    tier: SubscriptionTier
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None

class CreateCheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str

class SubscriptionDetails(BaseModel):
    id: str
    customer_id: str
    status: SubscriptionStatus
    current_period_end: datetime
    tier: SubscriptionTier
    planId: Optional[str] = None # Add the Stripe Price ID field
    cancel_at_period_end: bool
    created_at: datetime
    payment_method: Optional[str] = None

class CustomerPortalRequest(BaseModel):
    return_url: Optional[str] = None

class CustomerPortalResponse(BaseModel):
    portal_url: str

class WebhookEvent(BaseModel):
    type: str
    data: Dict[str, Any]

class EmbedSnippet(BaseModel):
    html: str
    javascript: str
    instructions: str

class ApiKeyResponse(BaseModel):
    api_key: str
