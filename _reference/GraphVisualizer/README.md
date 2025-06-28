# BeliefGraph - Dynamic Web Application

A comprehensive digital humanities project that automatically generates biographical profiles and curated quotes for influential thinkers, writers, and philosophers throughout history, focused on three core themes: **Truth**, **Love**, and **Beauty**.

## Refactored Architecture

This codebase has been refactored from a static site generator to a dynamic web application:

- **Database-driven**: Uses SQLite database instead of JSON files
- **Dynamic rendering**: Flask web framework with component-based templates
- **Single template**: One template renders all author pages dynamically
- **Sidebar navigation**: Persistent sidebar with searchable author list
- **Component architecture**: Reusable template components for quotes, biography, etc.

## Project Structure

```
BeliefGraph/
├── app.py                    # Flask application with routes
├── database.py              # SQLAlchemy models and database setup
├── author_processor.py      # Processes authors and saves to database
├── bibliography_generator.py # Generates biographical information
├── quote_generator.py       # Generates quotes with themes
├── test_database.py         # Test script with sample data
├── requirements.txt         # Python dependencies
├── templates/
│   ├── base.html           # Base template with sidebar layout
│   ├── components/         # Reusable template components
│   │   ├── sidebar.html    # Author list sidebar
│   │   ├── author_info.html
│   │   ├── biography.html
│   │   └── quote.html      # Individual quote component
│   └── pages/              # Page templates
│       ├── index.html      # Home page
│       └── author.html     # Author detail page
├── static/
│   └── css/
│       └── main.css        # Styles with sidebar layout
└── data/
    ├── sources.csv         # List of authors to process
    └── beliefgraph.db      # SQLite database (created on first run)
```

## Setup Instructions

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables**:
   Create a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

3. **Test the database setup**:
   ```bash
   python test_database.py
   ```
   This will create the database and add sample data for John Keats.

4. **Run the web application**:
   ```bash
   python app.py
   ```
   The application will be available at http://localhost:5000

5. **Process all authors** (optional):
   ```bash
   python author_processor.py
   ```
   This will process all authors from `data/sources.csv` and save them to the database.

## Features

- **Dynamic Routes**: `/author/<author_name>` for individual author pages
- **Searchable Sidebar**: Filter authors by name in real-time
- **Theme Tags**: Color-coded tags for Truth (blue), Love (red), and Beauty (green)
- **Responsive Design**: Works on desktop and mobile devices
- **Component-based**: Easy to maintain and extend
- **Neo4j Integration**: Graph database support for advanced relationship queries
- **Vector Search**: Semantic similarity search using sentence embeddings

## Database Schema

- **authors**: Stores author information (name, birth/death years, location, biography)
- **quotes**: Stores quotes with source links
- **tags**: Three theme tags (truth, love, beauty)
- **quote_tags**: Many-to-many relationship between quotes and tags

## Neo4j Integration and Vector Search

The project includes Neo4j graph database integration with vector search capabilities:

### Neo4j Setup

1. **Migrate data to Neo4j**:
   ```bash
   python neo4j_migration.py
   ```
   This creates nodes for Authors and Quotes with relationships.

2. **Explore the graph**:
   ```bash
   python neo4j_queries.py
   ```
   Run sample queries to explore the data.

### Vector Search

1. **Create vector embeddings**:
   ```bash
   python neo4j_vector_index.py
   ```
   This generates embeddings for all quotes using sentence-transformers.

2. **Search for similar quotes**:
   ```bash
   python test_vector_search.py
   ```
   Interactive tool to find semantically similar quotes.

See `VECTOR_SEARCH_README.md` for detailed documentation on vector search functionality.

## Development

To add new features or modify the application:

1. **Templates**: Edit files in `templates/` for UI changes
2. **Styles**: Modify `static/css/main.css` for styling
3. **Routes**: Add new routes in `app.py`
4. **Database**: Modify models in `database.py`

The application uses Flask's development server with auto-reload enabled, so changes will be reflected immediately.
