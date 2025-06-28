# BeliefGraph Neo4j Integration

This document describes the Neo4j graph database integration for the BeliefGraph project.

## Overview

The BeliefGraph data has been successfully migrated from SQLite to Neo4j, creating a knowledge graph that connects authors, quotes, and themes (truth, love, beauty).

## Graph Structure

### Nodes

1. **Author**
   - Properties: `name` (string)
   - Example: `(:Author {name: "Rumi"})`

2. **Quote**
   - Properties:
     - `text` (string) - The quote text
     - `author_name` (string) - The author's name
     - `tags` (array of strings) - Theme tags: ['truth'], ['love'], ['beauty'], or combinations
     - `source_link` (string) - Source URL if available
   - Example: `(:Quote {text: "...", author_name: "Rumi", tags: ["truth", "love"]})`

### Relationships

1. **WRITTEN_BY**: `(Quote)-[:WRITTEN_BY]->(Author)`
   - Connects each quote to its author

2. **WROTE**: `(Author)-[:WROTE]->(Quote)`
   - Inverse relationship showing authors' quotes

3. **SAME_AUTHOR**: `(Quote)-[:SAME_AUTHOR]-(Quote)`
   - Connects all quotes from the same author to each other

## Migration Summary

- **Total Authors**: 162
- **Total Quotes**: 2,321
- **Quotes by Theme**:
  - Love: 1,109
  - Truth: 1,046
  - Beauty: 815

## Connection Details

```
URI: neo4j://127.0.0.1:7687
Username: neo4j
Password: #$ER34er
```

## Usage

### Running the Migration

```bash
python neo4j_migration.py
```

The migration script:
- Connects to both SQLite and Neo4j databases
- Creates uniqueness constraints for author names
- Migrates all authors and quotes
- Establishes all relationships
- Provides verification statistics

### Exploring the Data

```bash
python neo4j_queries.py
```

This script demonstrates various Cypher queries for exploring the graph.

## Sample Cypher Queries

### Find all quotes by an author
```cypher
MATCH (q:Quote)-[:WRITTEN_BY]->(a:Author {name: 'Rumi'})
RETURN q.text, q.tags
```

### Find quotes about a specific theme
```cypher
MATCH (q:Quote)
WHERE 'love' IN q.tags
RETURN q.text, q.author_name
```

### Find authors who write about all three themes
```cypher
MATCH (a:Author)<-[:WRITTEN_BY]-(q:Quote)
WITH a, collect(DISTINCT q.tags) as all_tags
WHERE any(tags IN all_tags WHERE 'truth' IN tags) 
  AND any(tags IN all_tags WHERE 'love' IN tags)
  AND any(tags IN all_tags WHERE 'beauty' IN tags)
RETURN a.name
```

### Find quotes connecting multiple themes
```cypher
MATCH (q:Quote)
WHERE 'truth' IN q.tags AND 'beauty' IN q.tags
RETURN q.text, q.author_name
```

### Explore quote connections
```cypher
MATCH (q1:Quote)-[:SAME_AUTHOR]-(q2:Quote)
WHERE q1.author_name = 'Emily Dickinson'
RETURN q1.text, q2.text
LIMIT 10
```

### Get statistics
```cypher
// Count nodes
MATCH (a:Author) RETURN count(a) as author_count
MATCH (q:Quote) RETURN count(q) as quote_count

// Theme distribution
UNWIND ['truth', 'love', 'beauty'] as theme
MATCH (q:Quote)
WHERE theme IN q.tags
RETURN theme, count(q) as count
ORDER BY count DESC
```

## Files Created

1. **neo4j_migration.py** - Main migration script
2. **neo4j_queries.py** - Sample query explorer
3. **NEO4J_README.md** - This documentation

## Notes

- The migration is idempotent (safe to run multiple times) due to MERGE operations
- The script includes progress logging and error handling
- SAME_AUTHOR relationships create a fully connected subgraph for each author's quotes
- The `id()` function used for SAME_AUTHOR relationships is deprecated in newer Neo4j versions; consider using `elementId()` for future compatibility

## Next Steps

You can now:
1. Use Neo4j Browser to visualize the graph
2. Build graph-based features into your application
3. Explore complex relationships between authors, quotes, and themes
4. Create recommendation systems based on graph traversal
5. Analyze thematic connections across different authors and time periods
