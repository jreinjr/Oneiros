#!/usr/bin/env python3
"""
Demo script to send messages to the Oneiros app's /listen endpoint
This will display the message in the logger panel of the 3D graph visualization
"""

import requests
import json
import time
import sys

def send_message_to_logger(message, base_url="http://127.0.0.1:5000"):
    """
    Send a message to the /listen endpoint
    
    Args:
        message (str): The message to send
        base_url (str): The base URL of the Flask app
    
    Returns:
        dict: Response from the server
    """
    url = f"{base_url}/listen"
    headers = {"Content-Type": "application/json"}
    data = {"message": message}
    
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

def main():
    """Main demo function"""
    print("Oneiros Logger Demo")
    print("===================")
    print("This script will send messages to the logger panel in the 3D graph visualization.")
    print("Make sure:")
    print("1. The Flask app is running (python app.py)")
    print("2. You have the graph page open in your browser (http://localhost:5000)")
    print()
    
    # Send hello world
    print("Sending 'hello world' to the logger...")
    result = send_message_to_logger("hello world")
    
    if result:
        print(f"✓ Message sent successfully: {result}")
        print()
        
        # Send a few more example messages
        messages = [
            "Welcome to Oneiros!",
            "This is a test message from Python",
            "You can send any string to the logger",
            "Messages appear with a typing animation",
            "The logger shows the last 6 messages"
        ]
        
        print("Sending additional demo messages...")
        for i, msg in enumerate(messages, 1):
            time.sleep(2)  # Wait 2 seconds between messages
            print(f"  [{i}/{len(messages)}] Sending: '{msg}'")
            result = send_message_to_logger(msg)
            if result:
                print(f"  ✓ Sent successfully")
            else:
                print(f"  ✗ Failed to send")
        
        print()
        print("Demo complete! Check the logger panel in your browser.")
        print()
        print("Alternative method - Use the browser console:")
        print("1. Open the graph page in your browser")
        print("2. Open the browser's developer console (F12)")
        print("3. Type: await sendToLogger('Hello from browser!')")
        print("4. The message should appear in the logger panel immediately")
        
    else:
        print("✗ Failed to send message")
        sys.exit(1)

if __name__ == "__main__":
    main()
