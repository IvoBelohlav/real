# app/utils/json_patch.py
import json
import math
from typing import Any, Dict, List
from fastapi.responses import JSONResponse
from fastapi import FastAPI

def sanitize_float_values(obj: Any) -> Any:
    """Recursively sanitize infinity and NaN float values in any data structure."""
    if isinstance(obj, dict):
        return {k: sanitize_float_values(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_float_values(item) for item in obj]
    elif isinstance(obj, float):
        if math.isinf(obj):
            return 9999999 if obj > 0 else -9999999
        if math.isnan(obj):
            return None
    return obj

def patch_json_response(app: FastAPI) -> None:
    """Patch JSONResponse to handle infinity values."""
    original_init = JSONResponse.__init__
    
    def patched_init(self, content: Any, *args, **kwargs):
        sanitized_content = sanitize_float_values(content)
        original_init(self, sanitized_content, *args, **kwargs)
    
    JSONResponse.__init__ = patched_init
    
    print("✅ JSONResponse patched to handle infinity values")