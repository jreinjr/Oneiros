#!/usr/bin/env python3
"""
Test script for AI-enhanced logger functionality.
This script demonstrates sending log messages to Ollama for poetic transformation.
"""

import requests
import json
import time

def test_ollama_connection():
    """Test if Ollama is running and accessible."""
    try:
        response = requests.get('http://127.0.0.1:11434/api/tags')
        if response.status_code == 200:
            models = response.json().get('models', [])
            print("✓ Ollama is running")
            print(f"  Available models: {[m['name'] for m in models]}")
            
            # Check if llama3.2:3b is available
            model_names = [m['name'] for m in models]
            if 'llama3.2:3b' in model_names:
                print("✓ llama3.2:3b model is available")
                return True
            else:
                print("✗ llama3.2:3b model not found")
                print("  Please run: ollama pull llama3.2:3b")
                return False
        else:
            print("✗ Ollama API returned error")
            return False
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to Ollama at http://127.0.0.1:11434")
        print("  Please ensure Ollama is running")
        return False
    except Exception as e:
        print(f"✗ Error checking Ollama: {e}")
        return False

def transform_log_message(message):
    """Send a log message to Ollama for poetic transformation."""
    url = 'http://127.0.0.1:11434/api/generate'
    
    payload = {
        'model': 'llama3.2:3b',
        'prompt': f'Transform this technical log message into a poetic or philosophical statement. Keep it concise (under 100 characters). Original message: "{message}"',
        'stream': False,
        'options': {
            'temperature': 0.8,
            'max_tokens': 50
        }
    }
    
    try:
        print(f"\nOriginal: {message}")
        print("Transforming...", end='', flush=True)
        
        start_time = time.time()
        response = requests.post(url, json=payload)
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            transformed = result.get('response', message).strip()
            print(f" Done! ({elapsed:.2f}s)")
            print(f"Transformed: {transformed}")
            return transformed
        else:
            print(f" Failed! (Status: {response.status_code})")
            return message
            
    except Exception as e:
        print(f" Error: {e}")
        return message

def main():
    """Main test function."""
    print("=== AI-Enhanced Logger Test ===\n")
    
    # Test Ollama connection
    if not test_ollama_connection():
        print("\nPlease fix the above issues before testing.")
        return
    
    print("\n--- Testing Log Transformations ---")
    
    # Test messages
    test_messages = [
        "Node 42 → [13, 27, 89]",
        "Node 7 → 1 step: [3, 9, 15] | 2 steps: [21, 45, 67]",
        "Connection established between nodes",
        "Graph regenerated with 100 nodes",
        "Highlight steps changed to 3"
    ]
    
    for msg in test_messages:
        transform_log_message(msg)
        time.sleep(0.5)  # Small delay between requests
    
    print("\n=== Test Complete ===")
    print("\nThe logger in the web interface will now use Ollama to transform")
    print("log messages into poetic statements when AI-Enhanced Logging is enabled.")

if __name__ == "__main__":
    main()
