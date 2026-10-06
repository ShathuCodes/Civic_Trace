"""Structured and safe logging configuration for Hansard RAG."""

import logging
import sys


def setup_logging(level: str = "INFO") -> logging.Logger:
    """Configure console logging with utf-8 stream and standard format."""
    log_level = getattr(logging, level.upper(), logging.INFO)

    root_logger = logging.getLogger("hansard_rag")
    root_logger.setLevel(log_level)

    # Avoid duplicate handlers if called multiple times
    if not root_logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(log_level)
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        root_logger.addHandler(handler)

    return root_logger
