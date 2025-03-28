# app/models/guided_chat.py
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Union
import uuid

class BotResponse(BaseModel):
    text: str
    followUp: Optional[str] = None

class GuidedChatOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str = Field(..., max_length=200)
    icon: str = Field(..., max_length=50)
    next_flow: Optional[str] = Field(None, max_length=100)
    order: int
    bot_response: Optional[Union[Dict, str, BotResponse]] = None

    @field_validator("bot_response")
    def validate_bot_response(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            return {"text": v, "followUp": None}
        if isinstance(v, dict):
            if "text" not in v:
                v["text"] = str(v)
            if "followUp" not in v:
                v["followUp"] = None
            return v
        return v

class GuidedChatFlow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., max_length=100)
    options: List[GuidedChatOption] = Field(default_factory=list)
    language: str = "cze"
    active: bool = True

    @field_validator("options")
    def validate_options(cls, options):
        # Sort options by order
        options.sort(key=lambda x: x.order)
        
        # Validate unique order values
        order_values = [option.order for option in options]
        if len(order_values) != len(set(order_values)):
            raise ValueError("Option order values must be unique within a flow")

        # Validate unique IDs
        option_ids = [option.id for option in options]
        if len(option_ids) != len(set(option_ids)):
            raise ValueError("Option IDs must be unique within a flow")

        return options