#!/bin/bash

# Script to expose Oneiros Flask server to the web using ngrok

# Default port (Flask default from app.py)
PORT=5000

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "Error: ngrok is not installed"
    echo "Install ngrok from: https://ngrok.com/download"
    exit 1
fi

# Check if Flask server is running
if ! lsof -i:$PORT &> /dev/null; then
    echo "Warning: Flask server doesn't appear to be running on port $PORT"
    echo "Start the server first with: python app.py"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "Starting ngrok tunnel for port $PORT..."
echo "Press Ctrl+C to stop the tunnel"
echo ""

# Start ngrok with the Flask port
ngrok http $PORT