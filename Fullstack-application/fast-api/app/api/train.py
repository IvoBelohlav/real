from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
router = APIRouter()
class TrainRequest(BaseModel):
  data: str

@router.post("/train")
async def train_endpoint(request: TrainRequest):
   try:
        return {"message": "Model training initiated"}
   except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))