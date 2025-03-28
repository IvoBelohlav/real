# app/models/human_chat_models.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

class ChatMessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    SYSTEM = "system"

class ChatSessionStatus(str, Enum):
    WAITING = "waiting"    # User is waiting for an agent
    ACTIVE = "active"      # Chat is active with an agent
    CLOSED = "closed"      # Chat has been closed
    TRANSFERRED = "transferred"  # Chat has been transferred to another agent

class ChatMessage(BaseModel):
    session_id: str
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    sender_id: str
    sender_type: str  # "user", "agent", "system"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    message_type: ChatMessageType = ChatMessageType.TEXT
    metadata: Optional[Dict[str, Any]] = None
    read: bool = False

class HumanChatSession(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    user_id: str
    agent_id: Optional[str] = None
    status: ChatSessionStatus = ChatSessionStatus.WAITING
    requested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None

class AgentStatus(str, Enum):
    ONLINE = "online"
    AWAY = "away"
    BUSY = "busy"
    OFFLINE = "offline"

class AgentStatusModel(BaseModel):
    agent_id: str
    status: AgentStatus = AgentStatus.OFFLINE
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active_sessions: int = 0
    metadata: Optional[Dict[str, Any]] = None