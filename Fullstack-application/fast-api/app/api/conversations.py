from fastapi import APIRouter, HTTPException
from app.utils.database import get_conversations, get_logs
router = APIRouter()

@router.get("/conversations")
async def conversations_endpoint():
  try:
       logs = await get_conversations()
       return logs
  except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs")
async def logs_endpoint():
  try:
       logs = await get_logs()
       return logs
  except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))