from pydantic import BaseModel
from typing import List, Optional

class ChatRequest(BaseModel):
    query: str
    conversation_history: List[dict] = []
    language: str = "cs"
    user_id: Optional[str] = None  

class ChatResponse(BaseModel):
    reply: str
    followup_questions: Optional[List[str]] = None