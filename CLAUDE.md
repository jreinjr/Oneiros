# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Oneiros is a philosophical knowledge graph application combining:
- **Flask backend** with async message processing and LLM integration (OpenAI/Ollama)
- **3D graph visualization** using Three.js/ForceGraph3D with dynamic edge creation
- **Hybrid database** architecture (SQLite for persistence, Neo4j for graph/vector search)
- **Theme-based system** organizing content around truth/love/beauty concepts

## Development Commands

### Environment Setup
```bash
# Activate virtual environment (REQUIRED before any Python commands)
source venv/bin/activate  # or source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Required environment variables (.env file)
OPENAI_API_KEY=your_openai_api_key
SECRET_KEY=your_flask_secret_key
NEO4J_URI=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password
```

### Running the Application
```bash
# Start Neo4j database
./scripts/start-neo4j.sh

# Start Flask development server
python app.py  # Runs on http://localhost:5000 with debug=True
```

### Testing
```bash
# Run specific test suites
python research/test_single_author.py         # Test single author processing
python research/test_batch_authors.py          # Test batch processing
python research/test_batch_authors.py --custom # Custom author selection
python research/test_database.py               # Test database operations
python neo4j/test_vector_search.py             # Test vector search
python scripts/test_message_processing.py      # Test message handling
python scripts/test_caution_ranker.py          # Test caution ranking

# Run pytest if available
pytest
```

### Database Operations
```bash
# SQLite to Neo4j migration
python neo4j/neo4j_migration.py

# Setup Neo4j vector indices
python neo4j/neo4j_vector.py

# Process authors from CSV
python research/author_processor.py
```

## Architecture Patterns

### Message Processing Pipeline
- **Async processing** using ThreadPoolExecutor prevents UI blocking
- **Multiple modes**: echo, LLM (GPT-4/Ollama), quote, RAG (vector search + generation)
- **Queue management** prevents LLM request flooding
- **Separate handlers** for user responses vs screen text display

### Dynamic Graph System
- **Runtime edge creation** based on user interactions and message content
- **Force-directed layout** with configurable physics (app.py:1172-1200)
- **Theme-based coloring** affects both nodes and UI elements
- **Camera modes**: manual control, "dreaming" (orbital), "haiku" (wider orbit)

### Frontend Architecture
- **Modular JavaScript** with behavior controllers (static/js/GraphBehaviorController.js)
- **Event system** for graph interactions (static/js/EventSystem.js)
- **WebSocket-like updates** via polling for real-time graph changes
- **Direct Neo4j connection** from browser for graph data (when configured)

### Database Strategy
- **SQLite**: Primary storage for authors/quotes, auto-initialized on startup
- **Neo4j**: Graph relationships, vector embeddings, real-time queries
- **Migration path**: SQLite → Neo4j with preserved relationships
- **Vector search**: Sentence-transformers embeddings for semantic similarity

## Key Implementation Details

### Theme System
- Three philosophical themes stored as JSON configurations
- Runtime theme switching affects graph colors and content generation
- Theme context passed to LLMs for aligned responses

### Author Processing
- Structured output using OpenAI's JSON mode
- Batch processing with retry logic and detailed logging
- Generated content includes biography, quotes, and semantic connections

### Security Considerations
- Neo4j credentials configurable via API (never stored in frontend)
- Flask sessions for user state management
- Environment variables for sensitive configuration