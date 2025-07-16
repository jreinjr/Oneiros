# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## RULES

We are using a venv in this repo. Always be sure that the .venv is active before running any Python commands.

### Required Environment Variables
```bash
# .env file (required for all components)
OPENAI_API_KEY=your_openai_api_key
SECRET_KEY=your_flask_secret_key
NEO4J_URI=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password
```

## Component Architecture

### Research Agent (research/ directory)
- **SQLAlchemy models** with Neo4j migration scripts (research/database.py)
- **OpenAI integration** for content generation and structured outputs (research/author_processor.py)
- **Vector search** using sentence-transformers for semantic similarity (neo4j/neo4j_vector_index.py)
- **Batch processing** with logging and error handling (research/test_batch_authors.py)

### Web Interface (Flask application)
- **Dynamic routing** with component templates (app.py)
- **Author and quote display** with theme-based organization (templates/)
- **Neo4j configuration API** for secure credential management (/api/neo4j-config)
- **Responsive design** with sidebar navigation (static/css/main.css)

### 3D Graph Visualization (static/js/)
- **Modular JavaScript** with behavior controllers and event system (static/js/GraphBehaviorController.js)
- **Neo4j direct connection** for real-time graph data (static/js/graph/neo4j-connector.js)
- **Three.js rendering** with interactive orbit, zoom, filtering (static/js/graph/visualizer.js)
- **Theme-based visualization** with color-coded truth/love/beauty nodes (static/css/styles.css)

## Directory Structure

```
/home/jrein/Oneiros/
├── app.py                    # Main Flask application with all routes
├── requirements.txt          # Combined Python dependencies
├── CLAUDE.md                 # This documentation file
├── data/                     # Data files and SQLite database
│   ├── sources.csv          # Author list for processing
│   ├── beliefgraph.db       # SQLite database
│   └── logs/                # Processing logs
├── research/                 # Research agent components
│   ├── database.py          # SQLAlchemy models and database operations
│   ├── author_processor.py  # Main processing script
│   ├── data_models.py       # Pydantic data models
│   ├── bibliography_generator.py
│   ├── quote_generator.py
│   └── test_*.py           # Test scripts
├── neo4j/                   # Neo4j utilities
│   ├── neo4j_migration.py   # SQLite to Neo4j migration
│   ├── neo4j_queries.py     # Sample queries
│   ├── neo4j_vector_index.py # Vector search setup
│   └── test_vector_search.py # Vector search testing
├── templates/               # Flask templates
│   ├── base.html           # Base template with navigation
│   ├── components/         # Reusable components
│   └── pages/              # Page templates (index, author, graph)
└── static/                 # Web assets
    ├── css/                # Stylesheets
    └── js/                 # JavaScript including 3D visualization
        ├── graph/          # 3D graph components
        └── ui/             # UI components
```

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.