# app/config/manager.py
import os
import json
import yaml
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import logging
from functools import lru_cache
from app.utils.logging_config import get_module_logger

# Load environment variables
load_dotenv()

logger = get_module_logger(__name__)

class DatabaseConfig(BaseModel):
    """Database configuration."""
    url: str = Field(default="mongodb://localhost:27017")
    db_name: str = Field(default="ai_widget")
    max_pool_size: int = Field(default=100)
    min_pool_size: int = Field(default=10)
    max_idle_time_ms: int = Field(default=60000)
    connect_timeout_ms: int = Field(default=5000)
    server_selection_timeout_ms: int = Field(default=5000)
    max_retries: int = Field(default=3)
    retry_delay_ms: int = Field(default=500)
    
class RedisConfig(BaseModel):
    """Redis configuration."""
    url: Optional[str] = Field(default=None)
    enabled: bool = Field(default=False)
    max_retries: int = Field(default=3)
    retry_delay_ms: int = Field(default=500)
    default_ttl: int = Field(default=3600)
    
class AIServiceConfig(BaseModel):
    """AI service configuration."""
    openai_api_key: Optional[str] = Field(default=None)
    anthropic_api_key: Optional[str] = Field(default=None)
    monthly_token_budget: int = Field(default=1000000)
    model_name_cheap: str = Field(default="gpt-3.5-turbo")
    model_name_expensive: str = Field(default="gpt-4-turbo")
    max_tokens: int = Field(default=300)
    temperature: float = Field(default=0.4)
    enable_caching: bool = Field(default=True)
    cache_ttl: int = Field(default=3600)
    expensive_model_threshold: float = Field(default=0.7)
    
class PerformanceConfig(BaseModel):
    """Performance configuration."""
    slow_request_threshold: float = Field(default=1.0)
    memory_logging_interval: int = Field(default=3600)
    max_tracked_slow_requests: int = Field(default=100)
    
class SecurityConfig(BaseModel):
    """Security configuration."""
    jwt_secret: Optional[str] = Field(default=None)
    jwt_algorithm: str = Field(default="HS256")
    jwt_expiration_seconds: int = Field(default=86400)
    enable_rate_limiting: bool = Field(default=True)
    rate_limit_per_minute: int = Field(default=60)
    
class LoggingConfig(BaseModel):
    """Logging configuration."""
    level: str = Field(default="INFO")
    format: str = Field(default="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    file_path: Optional[str] = Field(default=None)
    max_file_size_mb: int = Field(default=10)
    backup_count: int = Field(default=5)
    console_logging: bool = Field(default=True)
    json_logging: bool = Field(default=False)

class AppConfig(BaseModel):
    """Complete application configuration."""
    env: str = Field(default="development")
    debug: bool = Field(default=False)
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    workers: int = Field(default=1)
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    redis: RedisConfig = Field(default_factory=RedisConfig)
    ai_service: AIServiceConfig = Field(default_factory=AIServiceConfig)
    performance: PerformanceConfig = Field(default_factory=PerformanceConfig)
    security: SecurityConfig = Field(default_factory=SecurityConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)

class ConfigManager:
    """
    Configuration manager that loads settings from multiple sources
    with proper precedence: defaults -> config file -> environment variables.
    """
    
    def __init__(self):
        self.config = AppConfig()
        self.env_prefix = "APP_"
        self.config_file_path = os.getenv("CONFIG_FILE_PATH", "config.yaml")
    
    def load_config(self) -> AppConfig:
        """
        Load configuration from all sources with proper precedence.
        
        Returns:
            AppConfig: Complete application configuration
        """
        # Start with default configuration
        config_dict = self.config.model_dump()
        
        # Load configuration from file if available
        file_config = self._load_config_from_file()
        if file_config:
            config_dict = self._merge_dicts(config_dict, file_config)
        
        # Override with environment variables
        env_config = self._load_config_from_env()
        if env_config:
            config_dict = self._merge_dicts(config_dict, env_config)
        
        # Create new config with merged values
        self.config = AppConfig(**config_dict)
        
        # Apply configuration to logger
        self._configure_logging()
        
        return self.config
    
    def _load_config_from_file(self) -> Dict[str, Any]:
        """
        Load configuration from file.
        Supports YAML and JSON formats.
        
        Returns:
            Dict[str, Any]: Configuration from file
        """
        if not os.path.exists(self.config_file_path):
            logger.warning(f"Config file not found: {self.config_file_path}")
            return {}
        
        try:
            with open(self.config_file_path, 'r') as f:
                if self.config_file_path.endswith(('.yaml', '.yml')):
                    return yaml.safe_load(f)
                elif self.config_file_path.endswith('.json'):
                    return json.load(f)
                else:
                    logger.warning(f"Unsupported config file format: {self.config_file_path}")
                    return {}
        except Exception as e:
            logger.error(f"Error loading config file: {str(e)}")
            return {}
    
    def _load_config_from_env(self) -> Dict[str, Any]:
        """
        Load configuration from environment variables.
        Environment variables should be prefixed with APP_.
        Nested keys are separated by double underscores.
        
        Returns:
            Dict[str, Any]: Configuration from environment variables
        """
        result = {}
        
        for key, value in os.environ.items():
            if key.startswith(self.env_prefix):
                # Remove prefix and convert to lowercase
                clean_key = key[len(self.env_prefix):].lower()
                
                # Handle nested keys (e.g., APP_DATABASE__URL)
                if "__" in clean_key:
                    parts = clean_key.split("__")
                    current = result
                    for part in parts[:-1]:
                        if part not in current:
                            current[part] = {}
                        current = current[part]
                    
                    # Set the value with type conversion
                    current[parts[-1]] = self._convert_env_value(value)
                else:
                    # Set top-level key
                    result[clean_key] = self._convert_env_value(value)
        
        return result
    
    def _convert_env_value(self, value: str) -> Any:
        """
        Convert environment variable string to appropriate type.
        
        Args:
            value: String value from environment variable
            
        Returns:
            Converted value with appropriate type
        """
        # Boolean values
        if value.lower() in ("true", "yes", "1", "on"):
            return True
        if value.lower() in ("false", "no", "0", "off"):
            return False
        
        # Integer
        try:
            return int(value)
        except ValueError:
            pass
        
        # Float
        try:
            return float(value)
        except ValueError:
            pass
        
        # JSON
        if value.startswith(("{", "[")) and value.endswith(("}", "]")):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                pass
        
        # String
        return value
    
    def _merge_dicts(self, dict1: Dict[str, Any], dict2: Dict[str, Any]) -> Dict[str, Any]:
        """
        Recursively merge two dictionaries.
        Values from dict2 take precedence over dict1.
        
        Args:
            dict1: Base dictionary
            dict2: Dictionary to merge in (takes precedence)
            
        Returns:
            Merged dictionary
        """
        result = dict1.copy()
        
        for key, value in dict2.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                # Recursively merge nested dictionaries
                result[key] = self._merge_dicts(result[key], value)
            else:
                # Override or add value
                result[key] = value
        
        return result
    
    def _configure_logging(self):
        """Configure logging based on configuration."""
        log_config = self.config.logging
        
        # Set log level
        level = getattr(logging, log_config.level.upper(), logging.INFO)
        root_logger = logging.getLogger()
        root_logger.setLevel(level)
        
        # Clear existing handlers
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)
        
        # Configure log format
        formatter = logging.Formatter(log_config.format)
        
        # Add console handler if enabled
        if log_config.console_logging:
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            root_logger.addHandler(console_handler)
        
        # Add file handler if file path is provided
        if log_config.file_path:
            try:
                # Create directory if it doesn't exist
                log_dir = os.path.dirname(log_config.file_path)
                if log_dir and not os.path.exists(log_dir):
                    os.makedirs(log_dir)
                
                # Use rotating file handler for log rotation
                from logging.handlers import RotatingFileHandler
                file_handler = RotatingFileHandler(
                    log_config.file_path,
                    maxBytes=log_config.max_file_size_mb * 1024 * 1024,
                    backupCount=log_config.backup_count
                )
                file_handler.setFormatter(formatter)
                root_logger.addHandler(file_handler)
            except Exception as e:
                logger.error(f"Error configuring file logging: {str(e)}")
        
        logger.info(f"Logging configured with level {log_config.level}")

@lru_cache()
def get_config() -> AppConfig:
    """
    Get application configuration as a singleton.
    Uses LRU cache to ensure config is loaded only once.
    
    Returns:
        AppConfig: Application configuration
    """
    config_manager = ConfigManager()
    return config_manager.load_config()

def get_database_config() -> DatabaseConfig:
    """Get database configuration section."""
    return get_config().database

def get_redis_config() -> RedisConfig:
    """Get Redis configuration section."""
    return get_config().redis

def get_ai_service_config() -> AIServiceConfig:
    """Get AI service configuration section."""
    return get_config().ai_service

def get_performance_config() -> PerformanceConfig:
    """Get performance configuration section."""
    return get_config().performance

def get_security_config() -> SecurityConfig:
    """Get security configuration section."""
    return get_config().security

def get_logging_config() -> LoggingConfig:
    """Get logging configuration section."""
    return get_config().logging