# Vector Search for BeliefGraph Quotes

This document explains how to set up and use vector embeddings for semantic similarity search on quotes in the Neo4j database.

## Overview

The vector search functionality adds semantic search capabilities to the BeliefGraph by:
1. Generating vector embeddings for each quote using sentence transformers
2. Creating a vector index in Neo4j for efficient similarity search
3. Providing an interactive search interface to find semantically similar quotes

## Prerequisites

1. Neo4j database with migrated BeliefGraph data (run `neo4j_migration.py` first)
2. Required Python packages:
   ```bash
   pip install sentence-transformers numpy
   ```

## Components

### 1. `neo4j_vector_index.py`
Sets up vector embeddings and creates the vector index:
- Uses the `all-MiniLM-L6-v2` model (384-dimensional embeddings)
- Creates a cosine similarity vector index named `quote_embeddings`
- Processes quotes in batches for efficiency
- Verifies the embedding process

### 2. `test_vector_search.py`
Interactive command-line tool for searching quotes:
- Accepts natural language queries
- Returns semantically similar quotes ranked by similarity score
- Displays author, tags, and similarity scores
- Allows viewing full quotes and multiple searches

## Setup Instructions

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Ensure Neo4j is running and data is migrated:**
   ```bash
   # If not already done, migrate data from SQLite to Neo4j
   python neo4j_migration.py
   ```

3. **Create vector embeddings and index:**
   ```bash
   python neo4j_vector_index.py
   ```
   
   This will:
   - Create a vector index with 384 dimensions
   - Generate embeddings for all quotes
   - Verify the process completed successfully
   - Run test queries to demonstrate functionality

4. **Use the interactive search tool:**
   ```bash
   python test_vector_search.py
   ```

## Usage Examples

### Running the Vector Index Setup

```bash
$ python neo4j_vector_index.py

2025-06-26 02:30:00,000 - INFO - Connected to Neo4j at neo4j://127.0.0.1:7687
2025-06-26 02:30:01,000 - INFO - Loaded sentence transformer model: all-MiniLM-L6-v2
2025-06-26 02:30:01,100 - INFO - Creating vector index...
2025-06-26 02:30:01,200 - INFO - Created vector index 'quote_embeddings' with 384 dimensions
2025-06-26 02:30:03,300 - INFO - Index status: ONLINE (100.0% populated)
2025-06-26 02:30:03,400 - INFO - Adding embeddings to quotes...
2025-06-26 02:30:03,500 - INFO - Total quotes to process: 1000
2025-06-26 02:30:05,000 - INFO - Processed 100/1000 quotes
...
```

### Using the Interactive Search

```bash
$ python test_vector_search.py

================================================================================
Quote Similarity Search using Vector Embeddings
================================================================================

This tool finds quotes similar to your input using semantic similarity.
Type 'quit' or 'exit' to stop.

Enter a phrase or concept to search for similar quotes: the nature of truth

How many results would you like? (default: 5): 3

Searching for quotes similar to 'the nature of truth'...

================================================================================
Query: 'the nature of truth'
================================================================================

1. Author: Plato
   Score: 0.8234
   Tags: truth, philosophy
   Quote:
    Truth is the beginning of every good to the gods, and of every
    good to man.

2. Author: Nietzsche
   Score: 0.7891
   Tags: truth, reality
   Quote:
    There are no facts, only interpretations.

3. Author: Buddha
   Score: 0.7456
   Tags: truth, wisdom
   Quote:
    Three things cannot be long hidden: the sun, the moon, and the
    truth.
```

## Technical Details

### Embedding Model
- **Model**: `all-MiniLM-L6-v2` from sentence-transformers
- **Dimensions**: 384
- **Advantages**: 
  - Lightweight and fast
  - Good performance for semantic similarity
  - Suitable for short to medium length texts

### Vector Index Configuration
- **Index Type**: HNSW (Hierarchical Navigatable Small World)
- **Similarity Function**: Cosine similarity
- **Dimensions**: 384 (matching the embedding model)

### Neo4j Cypher Queries

Create vector index:
```cypher
CREATE VECTOR INDEX quote_embeddings IF NOT EXISTS
FOR (q:Quote) ON q.embedding
OPTIONS {
    indexConfig: {
        `vector.dimensions`: 384,
        `vector.similarity_function`: 'cosine'
    }
}
```

Query similar quotes:
```cypher
CALL db.index.vector.queryNodes('quote_embeddings', 5, $embedding)
YIELD node, score
MATCH (node)-[:WRITTEN_BY]->(a:Author)
RETURN node.text as quote, a.name as author, node.tags as tags, score
ORDER BY score DESC
```

## Troubleshooting

1. **"No quotes have embeddings yet" error:**
   - Run `python neo4j_vector_index.py` first to generate embeddings

2. **"Vector search failed" error:**
   - Ensure the vector index exists: `SHOW INDEXES WHERE name = 'quote_embeddings'`
   - Check Neo4j version supports vector indexes (5.13+)

3. **Connection errors:**
   - Verify Neo4j is running
   - Check connection credentials in the scripts

4. **Memory issues with large datasets:**
   - Adjust the `batch_size` parameter in `add_embeddings_to_quotes()`
   - Consider using a smaller embedding model

## Performance Considerations

- Initial embedding generation is a one-time process
- Batch processing reduces memory usage
- Vector index provides fast approximate nearest neighbor search
- Cosine similarity is efficient for normalized embeddings

## Future Enhancements

1. **Alternative embedding models:**
   - Try larger models for better accuracy (e.g., `all-mpnet-base-v2`)
   - Experiment with domain-specific models

2. **Advanced search features:**
   - Filter by author or tags before vector search
   - Combine vector search with full-text search
   - Add date range filtering

3. **API integration:**
   - Add vector search endpoint to the Flask app
   - Create a web interface for similarity search

4. **Embedding updates:**
   - Add functionality to update embeddings for new quotes
   - Implement incremental index updates
