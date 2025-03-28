# app/main.py
import logging
from pathlib import Path
import sys
from typing import Optional, List, Dict, Any

from fastapi import (
    FastAPI,
    BackgroundTasks,
    Depends,
    APIRouter,
    HTTPException,
    Query,
    UploadFile,
    File
)
from app.api import logs, widget_faq_api, payments
from fastapi.middleware.cors import CORSMiddleware
from app.api import shop_info

from app.api.chat import router as chat_router, get_knowledge_base, get_ai_service
from app.api.admin import router as admin_router
from app.api.auth import router as auth_router, initialize_admin_user
from app.api.subscriptions import router as subscription_router
from app.utils import mongo
from app.middleware import rate_limit_middleware, get_user_from_token
from app.utils.logging_config import setup_logging, get_module_logger
from app.api import products, comparison_configs, business, guided_chat, widget_config, contact_admin_api
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.staticfiles import StaticFiles

# Import the JSON patch utility
from app.utils.json_patch import patch_json_response

import os
from dotenv import load_dotenv
import asyncio

load_dotenv()

# Configure root logger to output DEBUG logs
setup_logging()
logger = get_module_logger(__name__)

app = FastAPI()

# Apply the JSON patch to handle infinity values
patch_json_response(app)

# CORS Configuration
CORS_ORIGINS = [
    "http://localhost:3000",  # Next.js dashboard
    "http://localhost:8000",
    "http://127.0.0.1:5500",
    "https://127.0.0.1:5500",
    "http://127.0.0.1:5501",
    "https://127.0.0.1:5501",
    "http://localhost:8080",
    "https://689516.myshoptet.com",
    "https://client-production-b2b9.up.railway.app",
    "https://702265.myshoptet.com",
    "http://dvojkavit2.s3-website.eu-north-1.amazonaws.com",
    "https://mynewbucket3310.s3.eu-north-1.amazonaws.com",
    "https://pslib-cz.github.io/2023-p2a-web-vlastniprojekt-IvoDBelohlav",
    "https://pslib-cz.github.io/2023-p2a-web-vlastniprojekt-IvoDBelohlav/",
    "https://www.dvojkavit.cz",
    "https://www.dvojkavit.cz/",
    "https://www.dvojkavit.cz/kontakt",
    "https://www.dvojkavit.cz/web-na-miru",
    "https://www.dvojkavit.cz/wordpress",
    "https://www.dvojkavit.cz/shoptet",
    "https://www.dvojkavit.cz/o-nas",
    "http://2vit.s3-website.eu-north-1.amazonaws.com",
    "http://lermoplus.s3-website.eu-north-1.amazonaws.com",
    "http://lermoplus.s3-website.eu-north-1.amazonaws.com/"
]

# Updated CORS policy with wildcard origin for widgets while allowing credentials for dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow requests from any origin
    allow_credentials=True,  # Allow cookies
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*", "X-Api-Key"],  # Explicitly allow API key header
)

# Apply rate limiting middleware
app.middleware("http")(rate_limit_middleware)
app.middleware("http")(get_user_from_token)

@app.get("/health")
async def health_check():
    logger.debug("Health check endpoint called")
    return {"status": "healthy", "service": "fastapi", "version": "1.0.0"}

@app.get("/")
async def root():
    logger.debug("Root endpoint called")
    return {"message": "Welcome to AI Chatbot API"}

# Include routers with /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(comparison_configs.router, prefix="/api")
app.include_router(business.router, prefix="/api")
app.include_router(logs.router, prefix="/api")
app.include_router(guided_chat.router, prefix="/api")
app.include_router(widget_config.router, prefix="/api")
app.include_router(contact_admin_api.router, prefix="/api")
app.include_router(widget_faq_api.router, prefix="/api")
app.include_router(shop_info.router, prefix="/api")
app.include_router(subscription_router, prefix="/api")

# Include Routers
app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(products.router, prefix="/api", tags=["products"])
app.include_router(widget_config.router, prefix="/api", tags=["widget"])
app.include_router(payments.router, prefix="/api", tags=["payments"])

# Serve static files - must be after other routes
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
async def startup_event():
    logger.info("Starting application...")
    logger.info(f"MONGO_URL: {os.getenv('MONGO_URL')}")
    logger.info(f"MONGO_DB_NAME: {os.getenv('MONGO_DB_NAME')}")

    app.mongodb_client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    app.db = app.mongodb_client[os.getenv("MONGO_DB_NAME")]

    try:
        # Create indexes
        try:
            await mongo.create_indexes()
            logger.info("Created indexes")
        except Exception as e:
            # Handle index creation errors separately
            if "IndexKeySpecsConflict" in str(e):
                logger.warning(f"Index creation issue (continuing anyway): {e}")
            else:
                # Re-raise if it's not an index conflict
                raise

        # Verify DB connection
        if await mongo.verify_db():
            logger.info("Database connection verified")
        else:
            logger.error("Database connection verification failed. Aborting startup.")
            sys.exit(1)  # Stop startup if DB verification fails

        await initialize_admin_user(db=app.db)
        logger.info("Admin user initialized")

        # Initialize KnowledgeBase
        knowledge_base = await get_knowledge_base()
        logger.info("KnowledgeBase initialized")
        
        # Initialize AIService
        ai_service = await get_ai_service()
        logger.info("AIService initialized")

    except Exception as e:
        logger.error(f"Startup error: {e}", exc_info=True)
        logger.critical("Failed to start the application due to critical errors.")
        sys.exit(1)  # Exit with a non-zero status code to indicate failure

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)