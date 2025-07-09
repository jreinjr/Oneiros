#!/usr/bin/env python3
"""
Test script to verify that sentence transformer model optimization works correctly.
This script tests that a single model instance is shared across handlers.
"""

import asyncio
import logging
from message_processor import MessageProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_model_optimization():
    """Test that handlers share the same sentence transformer model"""
    
    # Configuration for message processor
    config = {
        'neo4j': {
            'uri': 'neo4j://127.0.0.1:7687',
            'username': 'neo4j',
            'password': '#$ER34er'
        },
        'ollama': {
            'endpoint': 'http://localhost:11434',
            'model': 'llama3.2'
        }
    }
    
    # Initialize processor
    processor = MessageProcessor(config)
    
    # Test that quote and rag handlers use the same model instance
    quote_handler = processor.handlers.get('quote')
    rag_handler = processor.handlers.get('rag')
    
    if quote_handler and rag_handler:
        # Check if they share the same model instance
        quote_model = quote_handler.model
        rag_model = rag_handler.quote_handler.model
        
        if quote_model is rag_model:
            logger.info("✓ Quote and RAG handlers share the same sentence transformer model")
        else:
            logger.error("✗ Quote and RAG handlers have different model instances")
            
        # Also check if they both use the processor's model
        if quote_model is processor.sentence_model:
            logger.info("✓ Quote handler uses processor's shared model")
        else:
            logger.error("✗ Quote handler doesn't use processor's shared model")
            
        if rag_model is processor.sentence_model:
            logger.info("✓ RAG handler uses processor's shared model")
        else:
            logger.error("✗ RAG handler doesn't use processor's shared model")
    
    # Test processing with quote handler
    try:
        test_message = "wisdom and truth"
        result = await processor.process_user_response_only(test_message, mode='quote')
        logger.info(f"Quote handler result: {result['type']}")
    except Exception as e:
        logger.error(f"Quote handler test failed: {e}")
    
    # Clean up
    await processor.shutdown()

if __name__ == "__main__":
    asyncio.run(test_model_optimization())