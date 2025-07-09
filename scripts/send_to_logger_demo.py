#!/usr/bin/env python3
"""
Demo script to send messages to the Oneiros app's /listen endpoint
This will display the message in the logger panel of the 3D graph visualization
"""

import requests
import json
import time
import sys

def send_message_to_logger(message, base_url="http://127.0.0.1:5000", user_mode=None, screen_mode=None):
    """
    Send a message to the /listen endpoint with new processing system
    
    Args:
        message (str): The message to send
        base_url (str): The base URL of the Flask app
        user_mode (str): Optional user response mode override
        screen_mode (str): Optional screen text mode override
    
    Returns:
        dict: Response from the server
    """
    url = f"{base_url}/listen"
    headers = {"Content-Type": "application/json"}
    data = {"message": message}
    
    if user_mode:
        data["user_mode"] = user_mode
    if screen_mode:
        data["screen_mode"] = screen_mode
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.ConnectionError:
        print(f"Error: Could not connect to {base_url}")
        print("Make sure the Flask app is running (python app.py)")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error sending message: {e}")
        return None

def get_current_settings(base_url="http://127.0.0.1:5000"):
    """Get current message processing settings"""
    url = f"{base_url}/api/settings"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error getting settings: {e}")
        return None

def update_settings(user_mode=None, screen_mode=None, base_url="http://127.0.0.1:5000"):
    """Update message processing settings"""
    url = f"{base_url}/api/settings"
    headers = {"Content-Type": "application/json"}
    data = {}
    
    if user_mode:
        data["user_response_mode"] = user_mode
    if screen_mode:
        data["screen_text_mode"] = screen_mode
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error updating settings: {e}")
        return None

def test_handlers(base_url="http://127.0.0.1:5000"):
    """Test all message handlers"""
    url = f"{base_url}/api/test-handlers"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error testing handlers: {e}")
        return None

def main():
    """Interactive text input for sending messages to the logger"""
    print("Oneiros Interactive Logger")
    print("=========================")
    print("Type messages and press Enter to send them to the logger panel.")
    print("Make sure:")
    print("1. The Flask app is running (python app.py)")
    print("2. You have the graph page open in your browser (http://localhost:5000/graph)")
    print()
    print("Type 'quit' or 'exit' to stop, or use Ctrl+C")
    print()
    
    try:
        while True:
            # Get user input
            message = input("Enter message: ").strip()
            
            # Check for exit commands
            if message.lower() in ['quit', 'exit', 'q']:
                print("Goodbye!")
                break
            
            # Skip empty messages
            if not message:
                continue
            
            # Send the message
            print(f"Sending: '{message}'")
            result = send_message_to_logger(message)
            
            if result and 'user_response' in result and 'content' in result['user_response']:
                print(result['user_response']['content'])
            else:
                print("✗ Failed to send message")
            print()
    
    except KeyboardInterrupt:
        print("\nGoodbye!")
    except EOFError:
        print("\nGoodbye!")

if __name__ == "__main__":
    main()
