#!/usr/bin/env python3
"""
Test script for settings API endpoints
"""

import requests
import json
import sys

# Base URL for the Flask app
BASE_URL = "http://localhost:5001"

def test_get_settings():
    """Test GET /api/control-settings endpoint"""
    print("Testing GET /api/control-settings...")
    try:
        response = requests.get(f"{BASE_URL}/api/control-settings")
        print(f"Status Code: {response.status_code}")
        if response.ok:
            settings = response.json()
            print(f"Settings retrieved: {json.dumps(settings, indent=2)[:200]}...")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_save_settings():
    """Test POST /api/control-settings endpoint"""
    print("\nTesting POST /api/control-settings...")
    test_settings = {
        "nodeCount": 150,
        "connectionDensity": 0.5,
        "nodeSize": 3,
        "currentTheme": "truth",
        "cameraMode": "dreaming",
        "timestamp": "2025-01-16T12:00:00.000Z"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/control-settings",
            headers={"Content-Type": "application/json"},
            json=test_settings
        )
        print(f"Status Code: {response.status_code}")
        if response.ok:
            result = response.json()
            print(f"Response: {result}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    """Run all tests"""
    print("Starting settings API tests...")
    print(f"Testing against: {BASE_URL}")
    print("-" * 50)
    
    # Test endpoints
    get_success = test_get_settings()
    save_success = test_save_settings()
    
    # Verify save worked
    if save_success:
        print("\nVerifying saved settings...")
        test_get_settings()
    
    print("-" * 50)
    if get_success and save_success:
        print("All tests passed!")
        return 0
    else:
        print("Some tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())