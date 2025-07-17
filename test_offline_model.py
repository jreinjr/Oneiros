#!/usr/bin/env python3
"""
Test script to verify offline sentence-transformers functionality
"""

import os
import sys
from sentence_transformers import SentenceTransformer

# Set the cache directory for offline models
MODEL_CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models_cache')
os.environ['SENTENCE_TRANSFORMERS_HOME'] = MODEL_CACHE_DIR

print(f"Using model cache directory: {MODEL_CACHE_DIR}")
print(f"Cache directory exists: {os.path.exists(MODEL_CACHE_DIR)}")

# Check cache contents
if os.path.exists(MODEL_CACHE_DIR):
    print(f"\nCache directory contents:")
    for root, dirs, files in os.walk(MODEL_CACHE_DIR):
        level = root.replace(MODEL_CACHE_DIR, '').count(os.sep)
        indent = ' ' * 2 * level
        print(f"{indent}{os.path.basename(root)}/")
        subindent = ' ' * 2 * (level + 1)
        for file in files[:5]:  # Show first 5 files
            print(f"{subindent}{file}")
        if len(files) > 5:
            print(f"{subindent}... and {len(files) - 5} more files")

try:
    print("\n" + "="*60)
    print("Testing offline model loading...")
    print("="*60)
    
    # Try to load the model
    model = SentenceTransformer('all-MiniLM-L6-v2')
    print("✅ Model loaded successfully!")
    
    # Test encoding
    test_sentences = [
        "This is a test sentence.",
        "Testing offline functionality.",
        "The quick brown fox jumps over the lazy dog."
    ]
    
    print("\nTesting model encoding...")
    embeddings = model.encode(test_sentences)
    
    print(f"✅ Encoding successful!")
    print(f"   Number of sentences: {len(test_sentences)}")
    print(f"   Embedding shape: {embeddings.shape}")
    print(f"   Embedding dimensions: {embeddings.shape[1]}")
    
    # Verify similarity calculation
    from sklearn.metrics.pairwise import cosine_similarity
    similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
    print(f"\n✅ Similarity calculation works!")
    print(f"   Similarity between first two sentences: {similarity:.4f}")
    
    print("\n" + "="*60)
    print("🎉 Offline model functionality verified successfully!")
    print("="*60)
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    print("\nOffline model loading failed. Make sure:")
    print("1. You have run download_models.py first")
    print("2. The models_cache directory exists and contains the model files")
    sys.exit(1)