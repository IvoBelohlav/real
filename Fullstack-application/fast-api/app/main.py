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
    File,
    status
)
from app.api import logs, widget_faq_api, payments
from fastapi.middleware.cors import CORSMiddleware
from app.api import shop_info

from app.api.chat import router as chat_router, get_knowledge_base, get_ai_service
from app.api.admin import router as admin_router
from app.api.auth import router as auth_router, initialize_admin_user
from app.api.subscriptions import router as subscription_router
from app.api.users import router as users_router
from app.api.domains import router as domains_router # Import domains router
from app.api.super_admin import router as super_admin_router # Import super_admin router
# Import other routers directly
from app.api.dashboard import router as dashboard_router
from app.api.widgets import router as widgets_router
from app.api.conversations import router as conversations_router
from app.api.api_keys import router as api_keys_router
from app.api.docs import router as docs_router
from app.api.knowledge_base import router as knowledge_base_router

from app.utils import mongo
# Removed get_user_from_token import
from app.middleware import rate_limit_middleware
from app.utils.logging_config import setup_logging, get_module_logger
from app.api import products, comparison_configs, business, guided_chat, widget_config, contact_admin_api
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.staticfiles import StaticFiles

# Import the JSON patch utility
from app.utils.json_patch import patch_json_response

import os
from dotenv import load_dotenv
import asyncio
import secrets
from fastapi.responses import JSONResponse
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
# Use mongo.py version of get_user_collection, not dependencies.py version
from app.utils.mongo import get_user_collection
from app.middleware import LoggingMiddleware, ErrorLoggingMiddleware
import traceback
from bson import json_util
import json
import math

load_dotenv()

# Configure root logger to output DEBUG logs
setup_logging()
logger = get_module_logger(__name__)

app = FastAPI(
    title="Customer Support AI API",
    description="API for customer support AI",
    version="1.0.0"
)

# Apply the JSON patch to handle infinity values
patch_json_response(app)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001", 
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5500", # Added for local testing via simple HTTP server
        "https://d129jv2av2liy7.cloudfront.net",
        "http://lermoplus.s3-website.eu-north-1.amazonaws.com",
        # Remove the wildcard "*" and add specific origins instead
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With", "X-API-Key"],
    expose_headers=["Content-Length"],
    max_age=600,
)

# Apply rate limiting middleware
app.middleware("http")(rate_limit_middleware)
# Removed get_user_from_token middleware registration
# app.middleware("http")(get_user_from_token)

# Add middleware
app.add_middleware(LoggingMiddleware)
app.add_middleware(ErrorLoggingMiddleware)

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
app.include_router(users_router, prefix="/api")
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

# Ensure the subscription router is properly mounted
app.include_router(subscription_router, prefix="/api")
app.include_router(payments.router, prefix="/api")

# Include newly added routers
app.include_router(widgets_router, prefix="/api", tags=["Widgets"])
app.include_router(conversations_router, prefix="/api", tags=["Conversations"])
app.include_router(api_keys_router, prefix="/api", tags=["API Keys"])
app.include_router(docs_router, prefix="/api", tags=["Documentation"])
app.include_router(knowledge_base_router, prefix="/api", tags=["Knowledge Base"])
app.include_router(dashboard_router, prefix="/api", tags=["Dashboard"])
app.include_router(domains_router, prefix="/api", tags=["Domains"]) # Include domains router
app.include_router(super_admin_router, prefix="/api") # Include super_admin router

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

        # Initialize admin user on startup
        logger.info("Initializing admin user...")
        admin_email = os.getenv("ADMIN_EMAIL")
        admin_password = os.getenv("ADMIN_PASSWORD")
        admin_api_key = os.getenv("ADMIN_API_KEY", "admin_dev_api_key_123456")
        
        if not admin_email or not admin_password:
            logger.error("Admin email or password not set in environment variables")
            return
        
        # Check if admin user exists and update their API key
        # Use app.db directly instead of calling get_db()
        user_collection = app.db.get_collection(mongo.USER_COLLECTION_NAME)
        
        # Find admin user
        admin_user = await user_collection.find_one({"email": admin_email.lower()})
        
        if admin_user and not admin_user.get("api_key"):
            # Update existing admin with API key if it doesn't have one
            logger.info(f"Setting API key for existing admin user: {admin_email}")
            await user_collection.update_one(
                {"email": admin_email.lower()},
                {"$set": {"api_key": admin_api_key}}
            )
            logger.info("Admin API key set successfully")
        elif admin_user:
            logger.info(f"Admin user already has API key: {admin_user.get('api_key', '')[0:5]}...")
        else:
            logger.info(f"Admin user not found: {admin_email}")
            # Admin user will be created by auth.initialize_admin_user with the API key
            
        # Call initialize_admin_user to create admin if it doesn't exist
        await initialize_admin_user(app.db)
        
    except Exception as e:
        logger.error(f"Startup error: {e}", exc_info=True)
        logger.critical("Failed to start the application due to critical errors.")
        sys.exit(1)  # Exit with a non-zero status code to indicate failure

@app.on_event("shutdown")
async def shutdown_event():
    """Close MongoDB connections on application shutdown."""
    logger.info("Shutting down application...")
    if hasattr(app, "mongodb_client"):
        app.mongodb_client.close()
        logger.info("MongoDB connection closed")

# Error handling
@app.exception_handler(Exception)
async def validation_exception_handler(request, exc):
    logger.error(f"Global exception handler caught: {str(exc)}")
    traceback_str = traceback.format_exc()
    logger.error(traceback_str)
    
    # Attempt to get a more useful error message for various exception types
    error_detail = str(exc)
    
    if hasattr(exc, "detail"):
        error_detail = exc.detail
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"An error occurred: {error_detail}"},
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
