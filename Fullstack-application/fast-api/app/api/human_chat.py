# app/api/human_chat.py
import logging
import json
import asyncio
from typing import Dict, List, Optional, Set, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query, Path, Request
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
import uuid
from bson import ObjectId

from app.models.human_chat_models import (
    HumanChatSession, ChatMessage, ChatSessionStatus, 
    AgentStatus, AgentStatusModel, ChatMessageType
)
from app.utils.mongo import (
    get_human_chat_collection,
    get_user_collection, # Need user collection to get domain_whitelist
    get_db,
    serialize_mongo_doc
)
from app.utils.logging_config import get_module_logger
from app.middleware import get_user_from_token
# Import verify_widget_origin and keep get_current_active_customer for other endpoints
from app.utils.dependencies import get_current_active_customer, verify_widget_origin
# Need urlparse and re for origin checking logic
from urllib.parse import urlparse
import re

logger = get_module_logger(__name__)
router = APIRouter()

# Store active connections
class ConnectionManager:
    def __init__(self):
        # Map of session_id to list of WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Map of user_id/agent_id to set of session_ids
        self.user_sessions: Dict[str, Set[str]] = {}
        # Map of WebSocket to session_id for easy lookup on disconnect
        self.socket_to_session: Dict[WebSocket, str] = {}
        # Map of WebSocket to user_id for identifying senders
        self.socket_to_user: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, session_id: str, user_id: str):
        """Connect a WebSocket to a session and associate it with a user"""
        await websocket.accept()
        
        # Add to session connections
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
        
        # Add to user sessions
        if user_id not in self.user_sessions:
            self.user_sessions[user_id] = set()
        self.user_sessions[user_id].add(session_id)
        
        # Store quick lookup mappings
        self.socket_to_session[websocket] = session_id
        self.socket_to_user[websocket] = user_id
        
        logger.info(f"WebSocket connected: user {user_id} joined session {session_id}")

    def disconnect(self, websocket: WebSocket):
        """Disconnect a WebSocket and clean up associated mappings"""
        session_id = self.socket_to_session.get(websocket)
        user_id = self.socket_to_user.get(websocket)
        
        if not session_id or not user_id:
            logger.warning(f"WebSocket disconnect: Could not find session or user")
            return

        # Remove from active connections
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
                logger.info(f"WebSocket disconnected: user {user_id} left session {session_id}")
            
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
        
        # Remove from user sessions
        if user_id in self.user_sessions:
            self.user_sessions[user_id].discard(session_id)
            if not self.user_sessions[user_id]:
                del self.user_sessions[user_id]
        
        # Remove from lookup mappings
        if websocket in self.socket_to_session:
            del self.socket_to_session[websocket]
        
        if websocket in self.socket_to_user:
            del self.socket_to_user[websocket]

    async def broadcast_to_session(self, session_id: str, message: Dict[str, Any]):
        """Broadcast a message to all connections in a session"""
        if session_id in self.active_connections:
            message_str = json.dumps(message)
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_text(message_str)
                except Exception as e:
                    logger.error(f"Error broadcasting to connection in session {session_id}: {str(e)}")

    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """Send a message to a specific connection"""
        try:
            message_str = json.dumps(message)
            await websocket.send_text(message_str)
        except Exception as e:
            logger.error(f"Error sending personal message: {str(e)}")

    def get_session_connections(self, session_id: str) -> List[WebSocket]:
        """Get all connections for a session"""
        return self.active_connections.get(session_id, [])

    def get_user_sessions(self, user_id: str) -> Set[str]:
        """Get all session IDs for a user"""
        return self.user_sessions.get(user_id, set())

# Create a connection manager instance
manager = ConnectionManager()

# Store agent statuses in memory for quick access
agent_statuses: Dict[str, AgentStatus] = {}

async def update_agent_status(agent_id: str, status: AgentStatus, db=None):
    """Update an agent's status in the database and in memory"""
    if db is None:
        db = await get_db()
    collection = db.get_collection("agent_statuses")
    
    now = datetime.now(timezone.utc)
    
    # Update in memory
    agent_statuses[agent_id] = status
    
    # Update in database
    update_data = {
        "status": status,
        "last_updated": now
    }
    
    # If agent is going offline, set active_sessions to 0
    if status == AgentStatus.OFFLINE:
        update_data["active_sessions"] = 0
    
    await collection.update_one(
        {"agent_id": agent_id},
        {"$set": update_data},
        upsert=True
    )
    
    logger.info(f"Agent {agent_id} status updated to {status}")
    return True

async def get_available_agent() -> Optional[str]:
    """Get an available agent ID or None if none available"""
    # First try to find ONLINE agents
    online_agents = [agent_id for agent_id, status in agent_statuses.items() 
                    if status == AgentStatus.ONLINE]
    
    if online_agents:
        # Get the agent with the least active sessions
        db = await get_db()
        collection = db.get_collection("agent_statuses")
        
        # Find agents with fewest active sessions
        agent_data = await collection.find(
            {"agent_id": {"$in": online_agents}}
        ).sort("active_sessions", 1).limit(1).to_list(length=1)
        
        if agent_data:
            return agent_data[0]["agent_id"]
    
    # If no ONLINE agents, try AWAY agents as fallback
    away_agents = [agent_id for agent_id, status in agent_statuses.items() 
                  if status == AgentStatus.AWAY]
                  
    if away_agents:
        db = await get_db()
        collection = db.get_collection("agent_statuses")
        
        agent_data = await collection.find(
            {"agent_id": {"$in": away_agents}}
        ).sort("active_sessions", 1).limit(1).to_list(length=1)
        
        if agent_data:
            return agent_data[0]["agent_id"]
    
    # No available agents
    return None

async def save_chat_message(message: ChatMessage, db=None) -> ChatMessage:
    """Save a chat message to the database"""
    if db is None:
        db = await get_db()
    collection = db.get_collection("human_chat_messages")
    
    message_dict = message.model_dump()
    await collection.insert_one(message_dict)
    logger.debug(f"Chat message saved: {message.message_id}")
    return message

async def create_human_chat_session(conversation_id: str, user_id: str) -> HumanChatSession:
    """Create a new human chat session"""
    collection = await get_human_chat_collection()
    
    # Check if there's already an active session for this conversation
    existing_session = await collection.find_one({
        "conversation_id": conversation_id,
        "status": {"$in": [ChatSessionStatus.WAITING, ChatSessionStatus.ACTIVE]}
    })
    
    if existing_session:
        logger.info(f"Returning existing session for conversation {conversation_id}")
        return HumanChatSession(**existing_session)
    
    session = HumanChatSession(
        session_id=str(uuid.uuid4()),
        conversation_id=conversation_id,
        user_id=user_id,
        created_at=datetime.now(timezone.utc),
        status=ChatSessionStatus.WAITING
    )
    
    # Save to database
    await collection.insert_one(session.model_dump())
    logger.info(f"Created new human chat session: {session.session_id}")
    
    return session

@router.post("/human-chat/request", response_model=Dict[str, Any])
async def request_human_chat(
    request: Request,
    conversation_id: Optional[str] = Query(None),
    # Use the stricter origin verification dependency for this widget endpoint
    current_user: dict = Depends(verify_widget_origin)
):
    """
    Request a human chat session.
    Uses the current active customer's ID for multi-tenancy.
    """
    try:
        # First try to get conversation_id from query parameters
        actual_conversation_id = conversation_id
        
        # If not in query params, try to get it from the request body
        if not actual_conversation_id:
            try:
                # Try to read the request body as JSON
                body = await request.json()
                actual_conversation_id = body.get("conversation_id")
            except:
                # If JSON parsing fails, try form data
                try:
                    form = await request.form()
                    actual_conversation_id = form.get("conversation_id")
                except:
                    # Last resort, try to get it from query params manually
                    query_params = dict(request.query_params)
                    actual_conversation_id = query_params.get("conversation_id")
        
        # Check if we have a conversation ID
        if not actual_conversation_id:
            raise HTTPException(
                status_code=422, 
                detail={"message": "field_required", "detail": ["conversation_id is required"]}
            )
        
        # Get user_id from the authenticated customer
        user_id = current_user["id"]
        
        logger.info(f"Creating human chat session for conversation: {actual_conversation_id}, user: {user_id}")
        session = await create_human_chat_session(actual_conversation_id, user_id)
        return {"success": True, "session": serialize_mongo_doc(session.model_dump())}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error requesting human chat: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/human-chat/sessions", response_model=List[Dict[str, Any]])
async def get_user_chat_sessions(
    current_user: dict = Depends(get_current_active_customer),
    status: Optional[str] = Query(None)
):
    """Get chat sessions for the authenticated user"""
    try:
        collection = await get_human_chat_collection()
        user_id = current_user["id"]
        
        # Build query filter
        query_filter = {"user_id": user_id}
        if status:
            query_filter["status"] = status
        
        sessions = await collection.find(query_filter).sort("created_at", -1).to_list(length=100)
        return [serialize_mongo_doc(session) for session in sessions]
    except Exception as e:
        logger.error(f"Error retrieving user chat sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/human-chat/sessions/{session_id}", response_model=Dict[str, Any])
async def get_chat_session(
    session_id: str,
    current_user: dict = Depends(get_current_active_customer)
):
    """Get details of a specific chat session"""
    try:
        collection = await get_human_chat_collection()
        user_id = current_user["id"]
        
        # Get the session with user_id filter for multi-tenancy
        session = await collection.find_one({
            "session_id": session_id,
            "user_id": user_id
        })
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return serialize_mongo_doc(session)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting chat session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/human-chat/sessions/{session_id}/messages", response_model=List[Dict[str, Any]])
async def get_chat_messages(
    session_id: str,
    limit: int = Query(50),
    before: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_active_customer)
):
    """Get messages for a specific chat session"""
    try:
        collection = await get_human_chat_collection()
        user_id = current_user["id"]
        
        # Check if session exists and belongs to user
        session = await collection.find_one({
            "session_id": session_id,
            "user_id": user_id
        })
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get messages
        db = await get_db()
        message_collection = db.get_collection("human_chat_messages")
        
        # Build query
        query = {"session_id": session_id}
        if before:
            query["_id"] = {"$lt": ObjectId(before)}
        
        messages = await message_collection.find(query).sort("timestamp", -1).limit(limit).to_list(length=limit)
        return [serialize_mongo_doc(message) for message in messages]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving chat messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/human-chat/sessions/{session_id}/close", response_model=Dict[str, Any])
async def close_session(
    session_id: str,
    reason: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_active_customer)
):
    """Close a chat session"""
    try:
        user_id = current_user["id"]
        
        # Check permissions
        collection = await get_human_chat_collection()
        session = await collection.find_one({
            "session_id": session_id,
            "user_id": user_id
        })
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        success = await close_chat_session(session_id, user_id, reason)
        return {"success": success}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error closing chat session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Agent-specific endpoints

@router.get("/agent/status", response_model=Dict[str, Any])
async def get_agent_status(
    agent_id: str = Depends(get_user_from_token)
):
    """Get an agent's current status"""
    try:
        db = await get_db()
        collection = db.get_collection("agent_statuses")
        
        status_data = await collection.find_one({"agent_id": agent_id})
        if not status_data:
            return {
                "agent_id": agent_id,
                "status": AgentStatus.OFFLINE,
                "active_sessions": 0,
                "last_updated": datetime.now(timezone.utc)
            }
        
        return serialize_mongo_doc(status_data)
    except Exception as e:
        logger.error(f"Error getting agent status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agent/status", response_model=Dict[str, Any])
async def update_status(
    status: AgentStatus,
    agent_id: str = Depends(get_user_from_token)
):
    """Update an agent's status"""
    try:
        success = await update_agent_status(agent_id, status)
        return {"success": success, "status": status}
    except Exception as e:
        logger.error(f"Error updating agent status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/agent/sessions", response_model=List[Dict[str, Any]])
async def get_agent_sessions(
    status: Optional[str] = Query(None),
    agent_id: str = Depends(get_user_from_token)
):
    """Get all active chat sessions assigned to an agent"""
    try:
        collection = await get_human_chat_collection()
        
        # Build query
        query = {"agent_id": agent_id}
        if status:
            query["status"] = status
        else:
            query["status"] = {"$in": [ChatSessionStatus.ACTIVE, ChatSessionStatus.WAITING]}
        
        # Get sessions
        sessions = await collection.find(query).to_list(length=50)
        return [serialize_mongo_doc(session) for session in sessions]
    except Exception as e:
        logger.error(f"Error getting agent sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/agent/waiting-sessions", response_model=List[Dict[str, Any]])
async def get_waiting_sessions(
    agent_id: str = Depends(get_user_from_token)
):
    """Get all sessions waiting for an agent"""
    try:
        collection = await get_human_chat_collection()
        
        # Get sessions
        sessions = await collection.find({
            "status": ChatSessionStatus.WAITING,
            "agent_id": None
        }).sort("requested_at", 1).to_list(length=50)
        
        return [serialize_mongo_doc(session) for session in sessions]
    except Exception as e:
        logger.error(f"Error getting waiting sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agent/sessions/{session_id}/claim", response_model=Dict[str, Any])
async def claim_session(
    session_id: str,
    agent_id: str = Depends(get_user_from_token)
):
    """Claim a waiting session"""
    try:
        success = await assign_agent_to_session(session_id, agent_id)
        return {"success": success}
    except Exception as e:
        logger.error(f"Error claiming session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoints

@router.websocket("/ws/human-chat/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    session_id: str,
    token: Optional[str] = Query(None),
    guest_id: Optional[str] = Query(None),
):
    """WebSocket endpoint for real-time human chat communication"""
    # Authenticate the connection - either by token or guest ID
    try:
        user_id = None
        
        # First try token authentication
        if token:
            try:
                from app.api.auth import decode_token
                payload = decode_token(token)
                user_id = payload.get("sub")
                
                if not user_id:
                    logger.warning("Token provided but no user_id found in payload")
            except Exception as e:
                logger.error(f"Token authentication error: {str(e)}")
        
        # If token auth failed, try guest ID
        if not user_id and guest_id:
            user_id = guest_id
            logger.info(f"Using guest_id for authentication: {guest_id}")
        
        # If still no user_id, fail the connection
        if not user_id:
            logger.warning("No valid authentication provided for WebSocket")
            await websocket.close(code=1008, reason="Authentication required")
            return
    except Exception as e:
        logger.error(f"WebSocket authentication error: {str(e)}")
        await websocket.close(code=1008, reason="Authentication error")
        return
    
    # Check if the session exists and the user has permission
    db = await get_db()
    collection = await get_human_chat_collection()
    session = await collection.find_one({"session_id": session_id})
    
    if not session:
        logger.warning(f"Session {session_id} not found")
        await websocket.close(code=1008, reason="Session not found")
        return
    
    # Check permissions - either the user is the session owner or an agent
    if session["user_id"] != user_id and session.get("agent_id") != user_id:
        logger.warning(f"User {user_id} not authorized for session {session_id}")
        await websocket.close(code=1008, reason="Not authorized")
        return

    # --- Add Origin Verification for WebSocket ---
    origin_header = websocket.headers.get("origin")
    if not origin_header:
        logger.warning(f"Origin header missing for WebSocket connection to session {session_id}")
        await websocket.close(code=1008, reason="Origin header missing")
        return

    request_hostname = None
    try:
        parsed_origin = urlparse(origin_header)
        request_hostname = parsed_origin.hostname
        if not request_hostname:
             logger.warning(f"Could not parse hostname from Origin header: '{origin_header}' for WebSocket session {session_id}")
             await websocket.close(code=1008, reason="Invalid Origin header")
             return
    except Exception as e:
        logger.error(f"Error parsing Origin header '{origin_header}' for WebSocket: {e}", exc_info=True)
        await websocket.close(code=1008, reason="Origin header parsing error")
        return

    # Fetch user document to get domain_whitelist (session only has user_id)
    user_collection = await get_user_collection(db)
    user_doc = await user_collection.find_one({"id": session["user_id"]})
    if not user_doc:
        # Should not happen if session exists, but handle defensively
        logger.error(f"User document not found for user_id {session['user_id']} associated with session {session_id}")
        await websocket.close(code=1008, reason="User data inconsistency")
        return

    authorized_domains = user_doc.get("domain_whitelist", [])
    is_authorized = False
    normalized_request_hostname = request_hostname.lower()

    for auth_domain in authorized_domains:
        normalized_auth_domain = auth_domain.lower().strip()
        if not normalized_auth_domain: continue
        if normalized_auth_domain.startswith('*.'):
            pattern = r'^(.*\.)?' + re.escape(normalized_auth_domain[2:]) + r'$'
            if re.fullmatch(pattern, normalized_request_hostname):
                is_authorized = True
                break
        elif normalized_auth_domain == normalized_request_hostname:
            is_authorized = True
            break

    if not is_authorized:
        logger.warning(f"Unauthorized Origin: '{origin_header}' (parsed as '{request_hostname}') for WebSocket session {session_id}, User: {session['user_id']}")
        await websocket.close(code=1008, reason="Domain not authorized")
        return
    # --- End Origin Verification ---

    logger.info(f"WebSocket connection established and origin verified for session {session_id}, user {user_id}")
    await manager.connect(websocket, session_id, user_id)

    try:
        # Load recent messages history
        message_collection = db.get_collection("human_chat_messages")
        recent_messages = await message_collection.find(
            {"session_id": session_id}
        ).sort("timestamp", 1).to_list(length=50)
        
        # Send chat history
        await websocket.send_json({
            "type": "history",
            "session": serialize_mongo_doc(session),
            "messages": [serialize_mongo_doc(msg) for msg in recent_messages]
        })
        
        # Send "user joined" system message
        join_notification = {
            "type": "user_joined",
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await manager.broadcast_to_session(session_id, join_notification)
        
        while True:
            # Wait for messages from the client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data["type"] == "message":
                # Handle new chat message
                content = message_data.get("content", "").strip()
                if not content:
                    continue
                
                # Create and save the message
                message = ChatMessage(
                    session_id=session_id,
                    content=content,
                    sender_id=user_id,
                    sender_type="agent" if user_id == session.get("agent_id") else "user",
                )
                
                await save_chat_message(message)
                
                # Send to everyone in the session
                await manager.broadcast_to_session(
                    session_id, 
                    {
                        "type": "new_message",
                        "message": serialize_mongo_doc(message.model_dump())
                    }
                )
            
            elif message_data["type"] == "typing":
                # Handle typing indicator
                is_typing = message_data.get("is_typing", False)
                
                # Forward typing status to everyone except sender
                typing_notification = {
                    "type": "typing",
                    "user_id": user_id,
                    "is_typing": is_typing,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
                for connection in manager.get_session_connections(session_id):
                    if connection != websocket:
                        await manager.send_personal_message(typing_notification, connection)
            
            elif message_data["type"] == "close_session" and user_id == session.get("agent_id"):
                # Only agents can close sessions through WebSocket
                reason = message_data.get("reason", "Chat closed by agent")
                await close_chat_session(session_id, user_id, reason)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        leave_notification = {
            "type": "user_left",
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await manager.broadcast_to_session(session_id, leave_notification)
    
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        manager.disconnect(websocket)
