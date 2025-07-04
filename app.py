"""Flask application for BeliefGraph dynamic website"""

from flask import Flask, render_template, abort, request, jsonify
from research.database import get_session, get_all_authors, get_author_by_name, init_database
import os
from datetime import datetime
import markdown2
from collections import deque
import threading

# Initialize Flask app
app = Flask(__name__)
# No SECRET_KEY needed for this art project
app.config['JSON_AS_ASCII'] = False  # Ensure proper Unicode handling in JSON responses

# Initialize database on startup
init_database()

# Message queue for the logger
message_queue = deque(maxlen=100)  # Keep last 100 messages
message_lock = threading.Lock()

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
    """Endpoint to receive strings and log them to the logger panel"""
    try:
        # Get the string from the request
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'error': 'No message provided'}), 400
        
        message = data['message']
        
        # Add message to queue
        with message_lock:
            message_queue.append({
                'message': message,
                'timestamp': datetime.now().isoformat()
            })
        
        return jsonify({
            'status': 'success',
            'message': 'Message received',
            'received': message
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/messages', methods=['GET'])
def get_messages():
    """Get all pending messages from the queue"""
    with message_lock:
        messages = list(message_queue)
        message_queue.clear()  # Clear the queue after reading
    
    return jsonify({
        'messages': messages
    })

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
