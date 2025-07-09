"""
Message Processor Package

This package handles the processing of incoming messages through different modes:
- Echo: Return input unchanged
- LLM: Process through local LLM (via Ollama)
- Quote: Vector search for top matching quote
- RAG: Vector search + LLM processing of result
"""

from .processor import MessageProcessor
from .handlers import EchoHandler, LLMHandler, QuoteHandler, RAGHandler
from .queue_manager import LLMQueueManager

__all__ = [
    'MessageProcessor',
    'EchoHandler',
    'LLMHandler', 
    'QuoteHandler',
    'RAGHandler',
    'LLMQueueManager'
]
