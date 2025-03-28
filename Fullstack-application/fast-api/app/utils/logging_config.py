import logging
import sys
from pathlib import Path

def setup_logging(log_level=logging.DEBUG):
    """
    Configure root logger and create formatters/handlers for consistent logging
    across the application. This setup uses UTF-8 encoding to handle a wide 
    range of characters.
    """
    # Create a custom formatter that encodes the message to UTF-8
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Clear any existing handlers to avoid duplicate logs
    root_logger.handlers.clear()

    # Create console handler with UTF-8 encoding
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    console_handler.setStream(sys.stdout) # Ensure output goes to stdout, using system encoding
    root_logger.addHandler(console_handler)

    # Optionally add file handler for persistent logging with UTF-8 encoding
    log_file = Path("app.log")
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setLevel(log_level)
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)

    # Make sure third-party loggers don't overwhelm our logs
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('asyncio').setLevel(logging.WARNING)
    logging.getLogger('httpcore').setLevel(logging.WARNING)
    logging.getLogger('openai').setLevel(logging.WARNING)

    return root_logger

def get_module_logger(module_name: str) -> logging.Logger:
    """
    Get a logger instance for a specific module with proper configuration.
    """
    logger = logging.getLogger(module_name)
    logger.setLevel(logging.DEBUG)  # Allow all log levels, let handlers filter
    
    # Don't add handlers if they already exist
    if not logger.handlers:
        # Propagate to root logger
        logger.propagate = True
    
    return logger