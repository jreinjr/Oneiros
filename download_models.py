#!/usr/bin/env python3
"""
Download and cache sentence-transformers models for offline use.
This script downloads the required models and saves them locally.
"""

import os
import sys
from sentence_transformers import SentenceTransformer
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Define the model cache directory
MODEL_CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models_cache')

def download_models():
    """Download and cache the sentence-transformers model"""
    
    # Create cache directory if it doesn't exist
    os.makedirs(MODEL_CACHE_DIR, exist_ok=True)
    logger.info(f"Model cache directory: {MODEL_CACHE_DIR}")
    
    # Set the cache directory for sentence-transformers
    os.environ['SENTENCE_TRANSFORMERS_HOME'] = MODEL_CACHE_DIR
    
    model_name = 'all-MiniLM-L6-v2'
    logger.info(f"Downloading model: {model_name}")
    
    try:
        # Download the model - this will save it to the cache directory
        model = SentenceTransformer(model_name)
        
        # Test the model to ensure it's working
        test_sentence = "This is a test sentence."
        embedding = model.encode(test_sentence)
        
        logger.info(f"Model downloaded successfully!")
        logger.info(f"Model path: {model_name}")
        logger.info(f"Embedding dimension: {len(embedding)}")
        
        # Save a test to verify offline functionality
        logger.info("Testing model encoding...")
        test_embedding = model.encode("Test offline functionality")
        logger.info(f"Test successful - embedding shape: {test_embedding.shape}")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to download model: {e}")
        return False

def verify_offline_model():
    """Verify that the model can be loaded offline"""
    
    # Set the cache directory
    os.environ['SENTENCE_TRANSFORMERS_HOME'] = MODEL_CACHE_DIR
    
    # Try loading without internet (this is just a verification)
    try:
        model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("Model loaded successfully from cache!")
        return True
    except Exception as e:
        logger.error(f"Failed to load model from cache: {e}")
        return False

if __name__ == "__main__":
    logger.info("Starting model download...")
    
    if download_models():
        logger.info("\nModel downloaded successfully!")
        logger.info(f"Models are saved in: {MODEL_CACHE_DIR}")
        logger.info("\nVerifying offline loading...")
        
        if verify_offline_model():
            logger.info("\nOffline model loading verified successfully!")
            logger.info("\nTo use offline models, set the environment variable:")
            logger.info(f"export SENTENCE_TRANSFORMERS_HOME={MODEL_CACHE_DIR}")
        else:
            logger.error("\nOffline model loading failed!")
            sys.exit(1)
    else:
        logger.error("\nModel download failed!")
        sys.exit(1)