"""Add vector embeddings and vector index to Neo4j Quote nodes"""

import os
import sys
import logging
from neo4j import GraphDatabase
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Dict, Tuple
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class Neo4jVectorIndex:
    def __init__(self, uri: str, username: str, password: str):
        """Initialize Neo4j connection and sentence transformer model"""
        self.driver = GraphDatabase.driver(uri, auth=(username, password))
        logger.info(f"Connected to Neo4j at {uri}")
        
        # Initialize sentence transformer model
        # Using all-MiniLM-L6-v2 which creates 384-dimensional embeddings
        # It's lightweight and performs well for semantic similarity
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("Loaded sentence transformer model: all-MiniLM-L6-v2")
        
    def close(self):
        """Close Neo4j connection"""
        self.driver.close()
        
    def create_vector_index(self):
        """Create vector index on Quote nodes"""
        with self.driver.session() as session:
            try:
                # Drop existing index if it exists
                session.run("DROP INDEX quote_embeddings IF EXISTS")
                logger.info("Dropped existing vector index (if any)")
            except:
                pass
            
            # Create vector index with 384 dimensions (for all-MiniLM-L6-v2)
            result = session.run("""
                CREATE VECTOR INDEX quote_embeddings IF NOT EXISTS
                FOR (q:Quote) ON q.embedding
                OPTIONS {
                    indexConfig: {
                        `vector.dimensions`: 384,
                        `vector.similarity_function`: 'cosine'
                    }
                }
            """)
            logger.info("Created vector index 'quote_embeddings' with 384 dimensions")
            
            # Wait for index to be online
            time.sleep(2)
            
            # Check index status
            status = session.run("""
                SHOW INDEXES
                YIELD name, state, populationPercent
                WHERE name = 'quote_embeddings'
                RETURN name, state, populationPercent
            """).single()
            
            if status:
                logger.info(f"Index status: {status['state']} ({status['populationPercent']}% populated)")
            
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts"""
        embeddings = self.model.encode(texts)
        # Convert to list of lists for Neo4j
        return [embedding.tolist() for embedding in embeddings]
    
    def add_embeddings_to_quotes(self, batch_size: int = 100):
        """Add embeddings to all Quote nodes"""
        with self.driver.session() as session:
            # Get total count
            total_count = session.run("MATCH (q:Quote) RETURN count(q) as count").single()["count"]
            logger.info(f"Total quotes to process: {total_count}")
            
            processed = 0
            
            # Process in batches
            while processed < total_count:
                # Fetch batch of quotes
                quotes = session.run("""
                    MATCH (q:Quote)
                    WHERE q.embedding IS NULL
                    RETURN elementId(q) as id, q.text as text
                    LIMIT $batch_size
                """, batch_size=batch_size).data()
                
                if not quotes:
                    break
                
                # Generate embeddings for this batch
                texts = [q['text'] for q in quotes]
                embeddings = self.generate_embeddings(texts)
                
                # Update quotes with embeddings
                for quote, embedding in zip(quotes, embeddings):
                    session.run("""
                        MATCH (q:Quote)
                        WHERE elementId(q) = $id
                        SET q.embedding = $embedding
                    """, id=quote['id'], embedding=embedding)
                
                processed += len(quotes)
                logger.info(f"Processed {processed}/{total_count} quotes")
                
            logger.info("Completed adding embeddings to all quotes")
            
    def verify_embeddings(self):
        """Verify that embeddings were added successfully"""
        with self.driver.session() as session:
            # Count quotes with embeddings
            with_embeddings = session.run("""
                MATCH (q:Quote)
                WHERE q.embedding IS NOT NULL
                RETURN count(q) as count
            """).single()["count"]
            
            # Count quotes without embeddings
            without_embeddings = session.run("""
                MATCH (q:Quote)
                WHERE q.embedding IS NULL
                RETURN count(q) as count
            """).single()["count"]
            
            logger.info(f"Quotes with embeddings: {with_embeddings}")
            logger.info(f"Quotes without embeddings: {without_embeddings}")
            
            # Sample a quote with embedding
            sample = session.run("""
                MATCH (q:Quote)
                WHERE q.embedding IS NOT NULL
                RETURN q.text as text, size(q.embedding) as embedding_size
                LIMIT 1
            """).single()
            
            if sample:
                logger.info(f"Sample quote: '{sample['text'][:50]}...'")
                logger.info(f"Embedding dimensions: {sample['embedding_size']}")
                
    def find_similar_quotes(self, query_text: str, limit: int = 5) -> List[Dict]:
        """Find quotes similar to the query text using vector similarity"""
        # Generate embedding for query
        query_embedding = self.model.encode(query_text).tolist()
        
        with self.driver.session() as session:
            # Query vector index
            results = session.run("""
                CALL db.index.vector.queryNodes('quote_embeddings', $limit, $embedding)
                YIELD node, score
                MATCH (node)-[:WRITTEN_BY]->(a:Author)
                RETURN node.text as quote, a.name as author, node.tags as tags, score
                ORDER BY score DESC
            """, limit=limit, embedding=query_embedding).data()
            
            return results

def main():
    import torch
    print(torch.cuda.is_available())

    """Main function to set up vector embeddings"""
    # Neo4j connection details
    NEO4J_URI = "neo4j://127.0.0.1:7687"
    NEO4J_USERNAME = "neo4j"
    NEO4J_PASSWORD = "#$ER34er"
    
    # Initialize vector index manager
    vector_index = Neo4jVectorIndex(NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD)
    
    try:
        # Create vector index
        logger.info("Creating vector index...")
        vector_index.create_vector_index()
        
        # Add embeddings to all quotes
        logger.info("Adding embeddings to quotes...")
        vector_index.add_embeddings_to_quotes()
        
        # Verify embeddings
        logger.info("Verifying embeddings...")
        vector_index.verify_embeddings()
        
        # Test similarity search
        logger.info("\n=== Testing similarity search ===")
        test_queries = [
            "The nature of truth and reality",
            "Love is the essence of life",
            "Beauty in simplicity"
        ]
        
        for query in test_queries:
            logger.info(f"\nQuery: '{query}'")
            similar_quotes = vector_index.find_similar_quotes(query, limit=3)
            
            for i, result in enumerate(similar_quotes, 1):
                logger.info(f"{i}. {result['author']}: \"{result['quote'][:80]}...\"")
                logger.info(f"   Tags: {result['tags']}, Score: {result['score']:.4f}")
        
        logger.info("\n=== Vector index setup completed successfully! ===")
        
    except Exception as e:
        logger.error(f"Vector index setup failed: {e}")
        raise
    finally:
        vector_index.close()

if __name__ == "__main__":
    main()
