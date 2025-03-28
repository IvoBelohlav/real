import json
import math
from typing import Any, Dict, List, Union
from bson import ObjectId  # Import ObjectId from bson

def sanitize_float_values(obj: Any) -> Any:
    """
    Recursively sanitize infinity and NaN float values in any data structure.
    
    Args:
        obj (Any): The object to sanitize
        
    Returns:
        Any: The sanitized object with infinity and NaN values replaced
    """
    if isinstance(obj, dict):
        return {k: sanitize_float_values(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_float_values(item) for item in obj]
    elif isinstance(obj, float):
        if math.isinf(obj):
            return 9999999 if obj > 0 else -9999999
        if math.isnan(obj):
            return None
    elif isinstance(obj, ObjectId):
        # Convert MongoDB ObjectId to string
        return str(obj)
    return obj

class MongoJSONEncoder(json.JSONEncoder):
    """
    Custom JSON encoder that can handle MongoDB ObjectId and other special types.
    """
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

def json_safe_dumps(obj: Any, **kwargs) -> str:
    """
    Safely convert Python objects to JSON strings, handling special cases
    like infinity, NaN values, and MongoDB ObjectId.
    
    Args:
        obj (Any): The object to convert to a JSON string
        **kwargs: Additional arguments to pass to json.dumps
        
    Returns:
        str: A JSON string representation of the object
    """
    sanitized_obj = sanitize_float_values(obj)
    
    # Use our custom encoder by default, but allow overriding
    if 'cls' not in kwargs:
        kwargs['cls'] = MongoJSONEncoder
    
    return json.dumps(sanitized_obj, **kwargs)