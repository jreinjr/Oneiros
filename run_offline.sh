#!/bin/bash
# Script to run the application with offline sentence-transformers models

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Set the models cache directory
export SENTENCE_TRANSFORMERS_HOME="$SCRIPT_DIR/models_cache"

echo "Using offline sentence-transformers models from: $SENTENCE_TRANSFORMERS_HOME"

# Activate virtual environment if it exists
if [ -f "$SCRIPT_DIR/.venv/bin/activate" ]; then
    source "$SCRIPT_DIR/.venv/bin/activate"
    echo "Virtual environment activated"
fi

# Run the Flask application
echo "Starting Flask application..."
python "$SCRIPT_DIR/app.py"