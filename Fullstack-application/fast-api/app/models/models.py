from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Any, List, Optional, Dict
from datetime import datetime, timezone
import uuid
from bson import ObjectId

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
            except:
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

class DailyStats(BaseModel):
    date: str
    messages: int

class MonthlyUsers(BaseModel):
    month: str
    users: int

class Statistics(BaseModel):
    totalUsers: int
    activeUsers: int
    totalMessages: int
    averageResponseTime: float
    dailyStats: List[DailyStats]
    monthlyUsers: List[MonthlyUsers]

# --- Order Tracking Models ---

class OrderItem(BaseModel):
    product_id: Optional[str] = None
    sku: Optional[str] = None
    name: str
    quantity: int
    price: float
    currency: str = "CZK" # Default currency

class Order(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str = Field(...) # Link to the user in your system
    source_platform: str = Field(...) # e.g., "shopify", "shoptet", "manual"
    platform_order_id: str = Field(...) # The order ID from the source platform
    order_number: Optional[str] = None # Display order number, might be same as platform_order_id
    status: str = Field(...) # e.g., "Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Refunded"
    items: List[OrderItem] = Field(default_factory=list)
    total_amount: float
    currency: str = "CZK"
    customer_email: Optional[str] = None # Important for linking
    customer_name: Optional[str] = None
    shipping_address: Optional[Dict[str, Any]] = None
    billing_address: Optional[Dict[str, Any]] = None
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    estimated_delivery_date: Optional[datetime] = None
    order_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None # Internal notes
    raw_webhook_data: Optional[Dict[str, Any]] = None # Store raw payload for debugging if needed

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()},
        json_schema_extra={
            "example": {
                "id": "60d5ec49f7e4e3a3e4d8f6a1",
                "user_id": "user_abc_123",
                "source_platform": "shoptet",
                "platform_order_id": "ORD-2024-9876",
                "order_number": "9876",
                "status": "Shipped",
                "items": [
                    {"product_id": "prod_1", "sku": "SKU001", "name": "Product A", "quantity": 1, "price": 100.0, "currency": "CZK"},
                    {"product_id": "prod_2", "sku": "SKU002", "name": "Product B", "quantity": 2, "price": 50.0, "currency": "CZK"}
                ],
                "total_amount": 200.0,
                "currency": "CZK",
                "customer_email": "customer@example.com",
                "customer_name": "Jan Novak",
                "tracking_number": "TRACK123456XYZ",
                "carrier": "PPL",
                "estimated_delivery_date": "2024-08-26T00:00:00Z",
                "order_date": "2024-08-25T10:30:00Z",
                "created_at": "2024-08-25T10:31:00Z",
                "updated_at": "2024-08-25T15:00:00Z",
            }
        }
    )

class OrderCreate(BaseModel):
    # Subset of Order fields needed for creation (e.g., via webhook)
    user_id: str
    source_platform: str
    platform_order_id: str
    status: str
    items: List[OrderItem]
    total_amount: float
    currency: Optional[str] = "CZK"
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    estimated_delivery_date: Optional[datetime] = None
    order_date: Optional[datetime] = None
    raw_webhook_data: Optional[Dict[str, Any]] = None

class OrderUpdate(BaseModel):
    # Fields that can be updated
    status: Optional[str] = None
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    estimated_delivery_date: Optional[datetime] = None
    notes: Optional[str] = None
    raw_webhook_data: Optional[Dict[str, Any]] = None # Allow updating raw data if needed
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# --- End Order Tracking Models ---

from typing import Optional # Ensure Optional is imported at the top if it isn't already
from typing import Optional # Ensure Optional is imported at the top if it isn't already

class HumanChatSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: Optional[str] = None  # Now OPTIONAL - this should fix the error
    user_id: str
    status: str = "waiting"  # 'waiting', 'active', 'ended'
    requested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    assigned_to: Optional[str] = None  # Agent ID
    assigned_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    wait_position: int = 0
    is_priority: bool = False
    user_info: Dict[str, Any] = Field(default_factory=dict)
    notes: Optional[str] = None
    reason: Optional[str] = None
class TakeSessionRequest(BaseModel):
    session_id: str
    agent_id: str
    agent_name: str

# Add model for human chat request
class HumanChatRequest(BaseModel):
    conversation_id: Optional[str] = None  # Make conversation_id optional
    user_id: str
    query: str
    language: str = "cs"
    user_info: Dict[str, Any] = Field(default_factory=dict)
    urgency: Optional[str] = None  # 'low', 'medium', 'high'
    reason: Optional[str] = None

# Add response model for human chat status
class HumanChatStatus(BaseModel):
    session_id: str
    status: str  # 'waiting', 'active', 'ended'
    wait_position: int = 0
    estimated_wait_time: Optional[int] = None  # in minutes
    agent_name: Optional[str] = None
    agent_id: Optional[str] = None
    message: Optional[str] = None


# Add model for admin response
class HumanChatResponse(BaseModel):
    session_id: str
    conversation_id: str
    agent_id: str
    agent_name: str
    response: str


# Add model for agent status update
class AgentStatusUpdate(BaseModel):
    agent_id: str
    status: str  # 'online', 'away', 'busy', 'offline'
    max_concurrent_chats: int = 3
    name: Optional[str] = None

class QAItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question: str = Field(..., max_length=500)
    answer: str = Field(..., max_length=2000)
    keywords: List[str] = Field(default_factory=list)
    category: Optional[str] = None
    language: str = "cze"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    active: bool = True
    type: str = "predefined"  # "predefined" or "learned" or "scraped"
    confidence_score: float = 0.0
    frequency: int = 0
    source: Optional[str] = None
    full_content: Optional[str] = None
    show_in_widget: bool = False
    widget_order: Optional[int] = None
    intent: Optional[str] = None # Intent of question
    intent_keywords: List[str] = Field(default_factory=list) # Keywords for intent
    confidence_threshold: Optional[float] = Field(default=0.7) # Default threshold

    @field_validator("keywords")
    def lower_case_keywords(cls, v):
        return [keyword.lower() for keyword in v]

    model_config = ConfigDict(arbitrary_types_allowed=True)

class QACreate(BaseModel):
    question: str = Field(..., max_length=500)
    answer: str = Field(..., max_length=2000)
    keywords: List[str]
    category: Optional[str] = None
    language: str = "cze"
    show_in_widget: bool = False
    widget_order: Optional[int] = None
    intent: Optional[str] = None
    intent_keywords: List[str] = Field(default_factory=list)
    confidence_threshold: Optional[float] = Field(default=0.7)

    @field_validator("keywords")
    def lower_case_keywords(cls, v):
        return [keyword.lower() for keyword in v]

class QAUpdate(BaseModel):
    question: Optional[str] = Field(None, max_length=500)
    answer: Optional[str] = Field(None, max_length=2000)
    keywords: Optional[List[str]] = None
    category: Optional[str] = None
    language: Optional[str] = None
    active: Optional[bool] = None
    show_in_widget: Optional[bool] = None
    widget_order: Optional[int] = None
    intent: Optional[str] = None
    intent_keywords: Optional[List[str]] = None
    confidence_threshold: Optional[float] = None

    @field_validator("keywords")
    def lower_case_keywords(cls, v):
        if v is None:
            return None
        return [keyword.lower() for keyword in v]

class QAResponse(BaseModel):
    items: List[QAItem]
    total: int
    page: int
    size: int
    metadata: Dict = Field(default_factory=dict)

class Subscription(BaseModel):
    user_id: str
    tier: str  # e.g., "free", "basic", "pro"
    start_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_date: Optional[datetime] = None
    # ... other relevant fields

class FeedbackData(BaseModel):
    query: str
    response: str
    was_helpful: bool
    user_id: Optional[str] = None
    language: str = "cze"
    context: Optional[Dict] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    query: str = Field(..., max_length=500)
    language: str = "cze"
    conversation_history: List[Dict] = Field(default_factory=list)
    context: Dict[str, Any] = Field(default_factory=dict)
    user_id: Optional[str] = None

    @field_validator("query")
    def validate_query(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Query cannot be empty")
        if len(v) > 1000:
            raise ValueError("Query too long")
        return v

class ChatResponse(BaseModel):
    reply: str
    source: str
    confidence_score: float
    conversation_id: Optional[str] = None
    followup_questions: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    personalized_recommendations: List[Dict] = Field(
        default_factory=list,
        description="Context-aware product recommendations with explanations, image URLs, and product URLs" # <---- UPDATED DESCRIPTION
    )
    order_details: Optional[Order] = None # Add field for structured order data

# Moved ConversationEntry here:

class ConversationEntry(BaseModel):
    conversation_id: Optional[str] = None  # Make conversation_id optional here too
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    query: str
    response: str
    source: str  # 'ai', 'human', or other sources
    language: str
    user_id: str  # Required field, default to "anonymous" in the handler
    confidence_score: float
    is_human_agent: bool = False  # Flag to identify messages from human agents
    human_agent_id: Optional[str] = None  # ID of the human agent who responded
    human_agent_name: Optional[str] = None  # Name of the human agent
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TrainRequest(BaseModel):
    data: str

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    api_key: Optional[str] = None # Add optional api_key field

class MessageResponse(BaseModel):
    message: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class GuidedChatOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str = Field(..., max_length=200)
    icon: str = Field(..., max_length=50)
    next_flow: Optional[str] = Field(None, max_length=100)
    order: int
    bot_response: Optional[dict] = Field(None)

    @field_validator("bot_response")
    def validate_bot_response(cls, v):
        if v is not None:
            if "text" not in v or not isinstance(v["text"], str):
                raise ValueError("bot_response must have a 'text' key with a string value")
        return v

class GuidedChatFlow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., max_length=100)
    options: List[GuidedChatOption] = Field(default_factory=list)
    language: str = "cze"
    active: bool = True

    @field_validator("options")
    def validate_options(cls, options):
        order_values = [option.order for option in options]
        if len(order_values) != len(set(order_values)):
            raise ValueError("Option order values must be unique within a flow")

        option_ids = [option.id for option in options]
        if len(option_ids) != len(set(option_ids)):
            raise ValueError("Option IDs must be unique within a flow")

        return options

class ComparisonConfig(BaseModel):
    category: str = Field(..., description="Product category")
    key_features: List[str] = Field(..., description="Key features for comparison")
    feature_weights: Dict[str, float] = Field(default_factory=dict, description="Weights for each feature (optional)")
    comparison_metrics: List[str] = Field(..., description="Metrics used for comparison")
    scoring_rules: Dict[str, Dict[str, float]] = Field(default_factory=dict, description="Scoring rules based on feature values")
    recommendation_template: str = Field(default="", description="Template for generating recommendations")

    @field_validator("feature_weights")
    def check_weights(cls, v):
        """Validate that feature weights sum up to 1, if provided."""
        if v and sum(v.values()) != 1.0:
            raise ValueError("Feature weights must sum up to 1")
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "category": "mobile",
                "key_features": ["display", "processor", "camera", "battery", "storage"],
                "feature_weights": {"display": 0.2, "processor": 0.3, "camera": 0.25, "battery": 0.15, "storage": 0.1},
                "comparison_metrics": ["price_performance", "camera_quality", "battery_life"],
                "scoring_rules": {
                    "display": {"OLED": 1.0, "AMOLED": 0.9, "LCD": 0.7},
                    "battery": {"value": 4000, "operator": ">"}
                },
                "recommendation_template": "{product1} is recommended for its superior {feature1}, while {product2} offers better {feature2}."
            }
        }
    }
