# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## RULES

We are using a venv in this repo. Always be sure that the .venv is active before running any Python commands.

## Project Overview

**Oneiros** is a unified digital humanities platform that combines AI research agents, dynamic web visualization, and 3D graph exploration to study philosophical themes of Truth, Love, and Beauty across historical thinkers.

**Unified Architecture**: Single codebase combining:
- **Research Agent** (research/ directory) - AI-powered data collection and processing  
- **Dynamic Website** (Flask app) - Interactive web interface with database backend
- **3D Graph Visualization** (static/js/) - Force-directed graph with Neo4j integration

## Unified Architecture

### Core Data Flow
1. **Research Agent** processes author list (sources.csv) → structured data via OpenAI
2. **Database Layer** (Neo4j primary, SQLite secondary) stores authors, quotes, themes
3. **Web Interface** renders dynamic author pages with sidebar navigation
4. **3D Visualization** queries Neo4j for graph relationships and theme filtering

### Central Data Store
**Neo4j Graph Database** serves as the primary data store:
- **Author nodes**: biographical data, birth/death years, location
- **Quote nodes**: text, themes (truth/love/beauty), source attribution
- **Relationships**: WROTE (author→quote), SAME_AUTHOR (quote↔quote), thematic connections

## Development Commands

### Main Application
```bash
# Run unified Flask application (includes 3D graph at /graph)
python app.py

# Install dependencies
pip install -r requirements.txt
```

### Database Operations
```bash
# Initialize and test database
python research/test_database.py

# Process authors from CSV (research agent)
python research/author_processor.py

# Migrate SQLite data to Neo4j
python neo4j/neo4j_migration.py

# Setup vector search embeddings
python neo4j/neo4j_vector_index.py
```

### Data Processing and Testing
```bash
# Test vector search functionality
python neo4j/test_vector_search.py

# Test Neo4j queries and relationships
python neo4j/neo4j_queries.py

# Run all tests
pytest research/                     # Run all tests
pytest research/test_single_author.py        # Test individual author processing
pytest research/test_batch_authors.py        # Test batch processing
pytest research/test_database.py             # Test database operations
```

## Unified Architecture Features

### Completed Integration
1. **Single Flask Application**: Unified web app serving both website and 3D graph
2. **Secure Neo4j Configuration**: Credentials served via API endpoint, configurable via environment
3. **Modular Structure**: Research agent, web interface, and 3D visualization properly separated
4. **Shared Templates**: Common base template with navigation between Authors and 3D Graph views
5. **Environment-based Configuration**: All sensitive data configurable via .env file

### Application Routes
- `/` - Main author listing page
- `/author/<name>` - Individual author detail pages  
- `/graph` - 3D graph visualization interface
- `/api/neo4j-config` - Neo4j configuration endpoint for client

## Data Models and Schema

### Pydantic Models (research/data_models.py)
```python
class Author:
    name: str
    birth_year: int
    death_year: Optional[int]
    birth_location: str
    biography: str

class Quote:
    text: str
    source_work: str
    link: Optional[str]
    themes: List[str]  # ['truth', 'love', 'beauty']
```

### Neo4j Schema
```cypher
(:Author {name, birth_year, death_year, birth_location, biography})
(:Quote {text, source_work, link, themes, author_name})
(:Author)-[:WROTE]->(:Quote)
(:Quote)-[:SAME_AUTHOR]-(:Quote)
```

## Environment Setup

### Required Environment Variables
```bash
# .env file (required for all components)
OPENAI_API_KEY=your_openai_api_key
SECRET_KEY=your_flask_secret_key
NEO4J_URI=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password
```

### Dependencies
```bash
# Install Python dependencies
pip install -r DatabaseGenerator/requirements.txt
pip install -r SiteVisualizer/requirements.txt

# Neo4j database (required for 3D visualization)
# Install Neo4j Desktop or use Docker
```

### Development Setup
1. **Create unified .env** with all required keys
2. **Start Neo4j database** (Desktop or Docker)
3. **Run database migrations** to populate Neo4j
4. **Test each component** individually before integration
5. **Use vector search** for semantic quote discovery

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

## Security (Art Project - Simplified)

- **API Keys**: Store OPENAI_API_KEY in .env file
- **Neo4j Credentials**: Configure via NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD environment variables
- **No Flask SECRET_KEY**: Removed for simplicity since sessions not needed

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