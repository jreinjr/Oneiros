#!/usr/bin/env python3
"""
Test script to verify message processing fixes:
1. Screen text uses correct processing mode (not always Echo)
2. User response returns immediately without waiting for screen text
"""

import requests
import json
import time
import sys

BASE_URL = "http://127.0.0.1:5000"

def test_processing_modes():
    """Test different processing mode combinations"""
    print("Testing Message Processing System")
    print("=" * 50)
    
    # Test cases with different mode combinations
    test_cases = [
        {
            "name": "Both Echo",
            "message": "Hello, world!",
            "user_mode": "echo",
            "screen_mode": "echo"
        },
        {
            "name": "User Echo, Screen LLM",
            "message": "Generate a haiku about the ocean",
            "user_mode": "echo",
            "screen_mode": "llm"
        },
        {
            "name": "User Quote, Screen Echo",
            "message": "Find wisdom about life",
            "user_mode": "quote",
            "screen_mode": "echo"
        },
        {
            "name": "Both LLM",
            "message": "Create poetry from this thought",
            "user_mode": "llm",
            "screen_mode": "llm"
        }
    ]
    
    for test in test_cases:
        print(f"\nTest: {test['name']}")
        print(f"Message: '{test['message']}'")
        print(f"Modes: User={test['user_mode']}, Screen={test['screen_mode']}")
        print("-" * 30)
        
        # Send the message
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/listen",
            json={
                "message": test["message"],
                "user_mode": test["user_mode"],
                "screen_mode": test["screen_mode"]
            },
            headers={"Content-Type": "application/json"}
        )
        response_time = time.time() - start_time
        
        if response.status_code != 200:
            print(f"ERROR: Request failed with status {response.status_code}")
            continue
        
        data = response.json()
        print(f"Response time: {response_time:.2f}s")
        
        # Check user response
        user_resp = data.get("user_response", {})
        print(f"\nUser Response ({user_resp.get('type', 'unknown')}):")
        print(f"  Content: {user_resp.get('content', 'N/A')[:80]}...")
        
        # Check screen text
        screen_text = data.get("screen_text", {})
        if screen_text.get("status") == "processing":
            print(f"\nScreen Text: Processing (task_id: {screen_text.get('task_id')})")
            
            # Poll for result
            task_id = screen_text.get("task_id")
            if task_id:
                print("  Polling for result...", end="", flush=True)
                for i in range(10):
                    time.sleep(1)
                    print(".", end="", flush=True)
                    
                    poll_resp = requests.post(
                        f"{BASE_URL}/api/poll-screen-text",
                        json={"task_id": task_id},
                        headers={"Content-Type": "application/json"}
                    )
                    
                    if poll_resp.status_code == 200:
                        poll_data = poll_resp.json()
                        if poll_data.get("status") == "completed":
                            screen_result = poll_data.get("screen_text", {})
                            print(f"\n  Result ({screen_result.get('type', 'unknown')}):")
                            print(f"  Content: {screen_result.get('content', 'N/A')[:80]}...")
                            break
                else:
                    print("\n  Timeout waiting for result")
        else:
            print(f"\nScreen Text ({screen_text.get('type', 'unknown')}):")
            print(f"  Content: {screen_text.get('content', 'N/A')[:80]}...")
        
        # Verify the modes are correct
        print("\nVerification:")
        user_type = user_resp.get('type', '').replace('_error', '')
        screen_type = screen_text.get('type', '').replace('_error', '').replace('_pending', '')
        
        user_match = user_type == test['user_mode']
        screen_match = screen_type == test['screen_mode'] or (
            test['user_mode'] == test['screen_mode'] and screen_type == user_type
        )
        
        print(f"  User mode correct: {'✓' if user_match else '✗'} ({user_type} == {test['user_mode']})")
        print(f"  Screen mode correct: {'✓' if screen_match else '✗'} ({screen_type} == {test['screen_mode']})")
        
        # Check if response was immediate (should be fast for non-LLM user modes)
        if test['user_mode'] not in ['llm', 'rag']:
            immediate = response_time < 2.0
            print(f"  Immediate response: {'✓' if immediate else '✗'} ({response_time:.2f}s)")

def main():
    """Main test function"""
    try:
        # Check if server is running
        response = requests.get(f"{BASE_URL}/api/settings")
        if response.status_code != 200:
            print("ERROR: Server is not responding. Make sure Flask app is running.")
            return
        
        # Run tests
        test_processing_modes()
        
        print("\n" + "=" * 50)
        print("Test completed!")
        
    except requests.exceptions.ConnectionError:
        print("ERROR: Cannot connect to server at", BASE_URL)
        print("Make sure the Flask app is running (python app.py)")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    main()
