"""Flask application for BeliefGraph dynamic website"""

from flask import Flask, render_template, abort, request, jsonify
from research.database import get_session, get_all_authors, get_author_by_name, init_database
import os
from datetime import datetime
import markdown2
from collections import deque
import threading
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from message_processor import MessageProcessor

# Initialize Flask app
app = Flask(__name__)
# No SECRET_KEY needed for this art project
app.config['JSON_AS_ASCII'] = False  # Ensure proper Unicode handling in JSON responses

# Initialize database on startup
init_database()

# Message queue for the logger (keeping for compatibility)
message_queue = deque(maxlen=100)  # Keep last 100 messages
message_lock = threading.Lock()

# Global variable to store pending screen text results
screen_text_queue = deque(maxlen=100)
screen_text_lock = threading.Lock()

# Initialize message processor
message_processor_config = {
    'ollama': {
        'endpoint': 'http://localhost:11434',
        'model': 'llama3.2:1b',
        'timeout': 30,
        'prompt_template': 'You are a haiku generation tool. Write a haiku inspired by the following message: "{message}" ONLY return the haiku and NOTHING else, no conversational pleasantries.',
        'rag_prompt_template': 'You are a haiku generation tool. Write a haiku inspired by the following message: "{message}" ONLY return the haiku and NOTHING else, no conversational pleasantries.'
    },
    'neo4j': {
        'uri': os.getenv('NEO4J_URI', 'neo4j://127.0.0.1:7687'),
        'username': os.getenv('NEO4J_USERNAME', 'neo4j'),
        'password': os.getenv('NEO4J_PASSWORD', '#$ER34er')
    }
}

# Global message processor instance
message_processor = None
executor = ThreadPoolExecutor(max_workers=4)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_or_create_event_loop():
    """Get the current event loop or create a new one"""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        return loop
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop

def run_async(coro):
    """Run async function in sync context"""
    loop = get_or_create_event_loop()
    return loop.run_until_complete(coro)

def init_message_processor():
    """Initialize the message processor"""
    global message_processor
    if message_processor is None:
        message_processor = MessageProcessor(message_processor_config)
        logger.info("Message processor initialized")

# Initialize message processor on startup
init_message_processor()

@app.route('/')
def index():
    """Home page - 3D Graph visualization"""
    return render_template('pages/graph.html')

@app.route('/wiki')
@app.route('/wiki/')
def wiki_index():
    """Wiki home page showing all authors"""
    session = get_session()
    try:
        authors = get_all_authors(session)
        return render_template('pages/index.html', 
                             authors=authors,
                             all_authors=authors,  # For sidebar
                             generation_date=datetime.now().strftime('%Y-%m-%d'))
    finally:
        session.close()

@app.route('/wiki/author/<author_name>')
def wiki_author_detail(author_name):
    """Individual author page in wiki"""
    session = get_session()
    try:
        # Replace underscores with spaces for author name lookup
        author_name = author_name.replace('_', ' ')
        author = get_author_by_name(session, author_name)
        
        if not author:
            abort(404)
        
        # Get all authors for sidebar
        all_authors = get_all_authors(session)
        
        return render_template('pages/author.html',
                             author=author,
                             all_authors=all_authors,
                             generation_date=datetime.now().strftime('%Y-%m-%d'))
    finally:
        session.close()

@app.route('/graph')
@app.route('/graph/')
def graph_visualization():
    """3D Graph visualization page (same as home)"""
    return render_template('pages/graph.html')

@app.route('/api/neo4j-config')
def neo4j_config():
    """Provide Neo4j configuration for client"""
    return jsonify({
        'uri': os.getenv('NEO4J_URI', 'neo4j://127.0.0.1:7687'),
        'username': os.getenv('NEO4J_USERNAME', 'neo4j'),
        'password': os.getenv('NEO4J_PASSWORD', '#$ER34er')
    })

@app.route('/listen', methods=['POST'])
def listen():
    """New endpoint to process messages through the message processor"""
    try:
        # Get the string from the request
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'error': 'No message provided'}), 400
        
        message = data['message']
        
        # Get optional processing mode overrides
        user_mode = data.get('user_mode')
        screen_mode = data.get('screen_mode')
        
        # Process user response immediately
        def process_user():
            return run_async(message_processor.process_user_immediate(message, user_mode))
        
        # Get user response
        user_result = executor.submit(process_user).result(timeout=30)
        
        # Schedule screen text processing asynchronously
        def process_screen_async():
            loop = get_or_create_event_loop()
            # Pass user result and mode for potential reuse
            task_id = loop.run_until_complete(
                message_processor.process_screen_async(
                    message, 
                    screen_mode, 
                    user_result['user_response'],
                    user_mode
                )
            )
            logger.info(f"Screen text processing scheduled with task ID: {task_id}")
            
            # Fetch the result and add to the screen text queue when ready
            if task_id:
                result = loop.run_until_complete(message_processor.get_task_result(task_id))
                if result:
                    # Add to screen text queue for polling
                    with screen_text_lock:
                        screen_text_queue.append({
                            'message': result,
                            'timestamp': datetime.now().isoformat()
                        })
                    logger.info(f"Screen text result ready and queued: {result.get('type')}")
        
        # Submit screen processing to run in background (don't wait)
        executor.submit(process_screen_async)
        
        # Also add to legacy queue for backward compatibility
        with message_lock:
            message_queue.append({
                'message': message,
                'timestamp': datetime.now().isoformat()
            })
        
        # Return ONLY the user response - no screen_text info
        return jsonify({
            'status': 'success',
            'user_response': user_result['user_response']
        }), 200
        
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/messages', methods=['GET'])
def get_messages():
    """Get all pending messages from the queue (legacy compatibility)"""
    with message_lock:
        messages = list(message_queue)
        message_queue.clear()  # Clear the queue after reading
    
    return jsonify({
        'messages': messages
    })

@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Get current message processing settings"""
    try:
        settings = message_processor.get_settings()
        return jsonify({
            'status': 'success',
            'settings': settings
        })
    except Exception as e:
        logger.error(f"Error getting settings: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings', methods=['POST'])
def update_settings():
    """Update message processing settings"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No settings provided'}), 400
        
        user_mode = data.get('user_response_mode')
        screen_mode = data.get('screen_text_mode')
        
        if user_mode or screen_mode:
            message_processor.update_settings(
                user_mode or message_processor.get_settings()['user_response_mode'],
                screen_mode or message_processor.get_settings()['screen_text_mode']
            )
        
        return jsonify({
            'status': 'success',
            'settings': message_processor.get_settings()
        })
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/screen-text/<task_id>', methods=['GET'])
def get_screen_text(task_id):
    """Get screen text result for a specific task"""
    try:
        def get_result():
            return run_async(message_processor.get_task_result(task_id))
        
        result = executor.submit(get_result).result(timeout=5)
        
        if result is None:
            return jsonify({
                'status': 'pending',
                'task_status': message_processor.get_task_status(task_id)
            })
        
        return jsonify({
            'status': 'completed',
            'result': result
        })
    except Exception as e:
        logger.error(f"Error getting screen text: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/poll-screen-text', methods=['POST'])
def poll_screen_text():
    """Poll for screen text results and display them when ready"""
    try:
        data = request.get_json()
        if not data or 'task_id' not in data:
            return jsonify({'error': 'No task_id provided'}), 400
        
        task_id = data['task_id']
        
        def get_result():
            return run_async(message_processor.get_task_result(task_id))
        
        result = executor.submit(get_result).result(timeout=0.5)
        
        if result is None:
            return jsonify({
                'status': 'pending',
                'task_status': message_processor.get_task_status(task_id)
            })
        
        return jsonify({
            'status': 'completed',
            'screen_text': result
        })
    except Exception as e:
        logger.error(f"Error polling screen text: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/screen-messages', methods=['GET'])
def get_screen_messages():
    """Get pending screen text messages for display"""
    with screen_text_lock:
        messages = list(screen_text_queue)
        screen_text_queue.clear()
    
    return jsonify({
        'messages': messages
    })

@app.route('/api/processing-status/<task_id>', methods=['GET'])
def get_processing_status(task_id):
    """Get the processing status of a specific task"""
    try:
        status = message_processor.get_task_status(task_id)
        return jsonify({
            'status': 'success',
            'task_status': status
        })
    except Exception as e:
        logger.error(f"Error getting processing status: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/queue-info', methods=['GET'])
def get_queue_info():
    """Get information about the LLM processing queue"""
    try:
        info = message_processor.get_queue_info()
        return jsonify({
            'status': 'success',
            'queue_info': info
        })
    except Exception as e:
        logger.error(f"Error getting queue info: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/test-handlers', methods=['GET'])
def test_handlers():
    """Test all message handlers"""
    try:
        def test_all():
            return run_async(message_processor.test_handlers())
        
        results = executor.submit(test_all).result(timeout=30)
        
        return jsonify({
            'status': 'success',
            'test_results': results
        })
    except Exception as e:
        logger.error(f"Error testing handlers: {e}")
        return jsonify({'error': str(e)}), 500

@app.template_filter('format_years')
def format_years(birth_year, death_year=None):
    """Format birth and death years"""
    if not birth_year:
        return ""
    if death_year:
        return f"({birth_year}–{death_year})"
    else:
        return f"(b. {birth_year})"

@app.template_filter('theme_color')
def get_theme_color(theme):
    """Get CSS color class for theme"""
    theme_str = str(theme).lower()
    color_map = {
        'truth': 'theme-truth',
        'love': 'theme-love', 
        'beauty': 'theme-beauty'
    }
    return color_map.get(theme_str, 'theme-default')

@app.template_filter('url_safe')
def url_safe(name):
    """Convert author name to URL-safe format"""
    return name.replace(' ', '_')

@app.template_filter('clean_text')
def clean_text(text):
    """Clean text to handle any remaining Unicode issues"""
    if not text:
        return ""
    
    # Replace common problematic Unicode characters
    replacements = {
        '\u2014': '--',  # em dash
        '\u2013': '-',   # en dash
        '\u2018': "'",   # left single quote
        '\u2019': "'",   # right single quote
        '\u201C': '"',   # left double quote
        '\u201D': '"',   # right double quote
        '\u2026': '...',  # ellipsis
        '\u00A0': ' ',   # non-breaking space
    }
    
    for unicode_char, replacement in replacements.items():
        text = text.replace(unicode_char, replacement)
    
    return text

@app.template_filter('markdown')
def render_markdown(text):
    """Convert markdown text to HTML with proper formatting"""
    if not text:
        return ""
    
    # Configure markdown2 with useful extras
    extras = [
        'target-blank-links',  # Open links in new tabs
        'fenced-code-blocks',  # Support for code blocks
        'tables',  # Support for tables
        'cuddled-lists',  # Lists without blank lines
    ]
    
    # Convert markdown to HTML
    # Note: We're NOT using 'break-on-newline' to allow proper paragraph separation
    html = markdown2.markdown(
        text,
        extras=extras
    )
    
    # Ensure proper paragraph wrapping
    # If the content doesn't start with a tag, wrap it in a paragraph
    if html and not html.strip().startswith('<'):
        # Split by double newlines to create paragraphs
        paragraphs = html.strip().split('\n\n')
        html = '\n'.join(f'<p>{p.strip()}</p>' for p in paragraphs if p.strip())
    
    return html

@app.errorhandler(404)
def page_not_found(e):
    """404 error handler"""
    session = get_session()
    try:
        all_authors = get_all_authors(session)
        return render_template('pages/404.html', all_authors=all_authors), 404
    finally:
        session.close()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
