### app/utils/cache.py ###

import os
import json
import redis
from typing import Any, Optional
from app.utils.logging_config import get_module_logger

logger = get_module_logger(__name__)

# Redis configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
DEFAULT_TTL = 3600  # Default TTL of 1 hour

# Initialize Redis connection
try:
    if REDIS_PASSWORD:
        cache = redis.StrictRedis(
            host=REDIS_HOST, 
            port=REDIS_PORT, 
            password=REDIS_PASSWORD, 
            decode_responses=True
        )
    else:
        cache = redis.StrictRedis(
            host=REDIS_HOST, 
            port=REDIS_PORT, 
            decode_responses=True
        )
    cache.ping()  # Test the connection
    logger.info("Redis connection successful")
except redis.exceptions.ConnectionError as e:
    logger.error(f"Error connecting to Redis: {e}")
    cache = None  # Disable caching if Redis is unavailable

def set_cache(key: str, value: Any, ttl: int = DEFAULT_TTL) -> bool:
    """
    Sets a value in the cache with a given key and time-to-live (TTL).
    
    Args:
        key: The cache key
        value: The value to cache (will be JSON serialized)
        ttl: Time to live in seconds (default 1 hour)
        
    Returns:
        bool: True if successful, False otherwise
    """
    if not cache:
        return False
        
    try:
        serialized_value = json.dumps(value)
        cache.setex(key, ttl, serialized_value)
        logger.debug(f"Successfully cached value for key: {key}")
        return True
    except Exception as e:
        logger.error(f"Error setting cache for key {key}: {e}")
        return False

def get_cache(key: str) -> Optional[Any]:
    """
    Retrieves a value from the cache by key.
    
    Args:
        key: The cache key
        
    Returns:
        The cached value if found, None otherwise
    """
    if not cache:
        return None
        
    try:
        cached_value = cache.get(key)
        if cached_value:
            logger.debug(f"Cache hit for key: {key}")
            return json.loads(cached_value)
        logger.debug(f"Cache miss for key: {key}")
        return None
    except Exception as e:
        logger.error(f"Error getting cache for key {key}: {e}")
        return None

def delete_cache(key: str) -> bool:
    """
    Deletes a key from the cache.
    
    Args:
        key: The cache key to delete
        
    Returns:
        bool: True if successful, False otherwise
    """
    if not cache:
        return False
        
    try:
        cache.delete(key)
        logger.debug(f"Successfully deleted cache key: {key}")
        return True
    except Exception as e:
        logger.error(f"Error deleting cache key {key}: {e}")
        return False

def clear_cache() -> bool:
    """
    Clears all keys from the cache.
    
    Returns:
        bool: True if successful, False otherwise
    """
    if not cache:
        return False
        
    try:
        cache.flushdb()
        logger.info("Successfully cleared entire cache")
        return True
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        return False

def get_cache_info() -> dict:
    """
    Gets information about the cache state.
    
    Returns:
        dict: Cache information including size, memory usage, etc.
    """
    if not cache:
        return {"status": "disabled"}
        
    try:
        info = cache.info()
        return {
            "status": "connected",
            "used_memory": info["used_memory_human"],
            "connected_clients": info["connected_clients"],
            "total_keys": cache.dbsize()
        }
    except Exception as e:
        logger.error(f"Error getting cache info: {e}")
        return {"status": "error", "message": str(e)}