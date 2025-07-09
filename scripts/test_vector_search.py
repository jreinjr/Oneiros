"""Interactive test script for vector similarity search on quotes"""

import os
import sys
import logging
from neo4j import GraphDatabase
from sentence_transformers import SentenceTransformer
from typing import List, Dict
import textwrap

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class QuoteSimilaritySearch:
    def __init__(self, uri: str, username: str, password: str):
        """Initialize Neo4j connection and sentence transformer model"""
        self.driver = GraphDatabase.driver(uri, auth=(username, password))
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("Initialized quote similarity search")
        
    def close(self):
        """Close Neo4j connection"""
        self.driver.close()
        
    def search_similar_quotes(self, query_text: str, limit: int = 5) -> List[Dict]:
        """Find quotes similar to the query text using vector similarity"""
        # Generate embedding for query
        query_embedding = self.model.encode(query_text).tolist()
        
        with self.driver.session() as session:
            # First check if vector index exists and has data
            index_check = session.run("""
                MATCH (q:Quote)
                WHERE q.embedding IS NOT NULL
                RETURN count(q) as count
            """).single()
            
            if index_check['count'] == 0:
                logger.warning("No quotes have embeddings yet. Please run neo4j_vector_index.py first.")
                return []
            
            # Query vector index
            try:
                results = session.run("""
                    CALL db.index.vector.queryNodes('quote_embeddings', $limit, $embedding)
                    YIELD node, score
                    MATCH (node)-[:WRITTEN_BY]->(a:Author)
                    RETURN node.text as quote, a.name as author, node.tags as tags, score
                    ORDER BY score DESC
                """, limit=limit, embedding=query_embedding).data()
                
                return results
            except Exception as e:
                logger.error(f"Vector search failed: {e}")
                logger.info("Make sure the vector index exists. Run neo4j_vector_index.py if needed.")
                return []
    
    def display_results(self, query: str, results: List[Dict]):
        """Display search results in a formatted way"""
        print(f"\n{'='*80}")
        print(f"Query: '{query}'")
        print(f"{'='*80}\n")
        
        if not results:
            print("No results found.")
            return
            
        for i, result in enumerate(results, 1):
            # Wrap long quotes
            wrapped_quote = textwrap.fill(result['quote'], width=70, initial_indent='    ', subsequent_indent='    ')
            
            print(f"{i}. Author: {result['author']}")
            print(f"   Score: {result['score']:.4f}")
            print(f"   Tags: {', '.join(result['tags'])}")
            print(f"   Quote:")
            print(wrapped_quote)
            print()

def main():
    """Main interactive search function"""
    # Neo4j connection details
    NEO4J_URI = "neo4j://127.0.0.1:7687"
    NEO4J_USERNAME = "neo4j"
    NEO4J_PASSWORD = "#$ER34er"
    
    # Initialize search
    search = QuoteSimilaritySearch(NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD)
    
    try:
        print("\n" + "="*80)
        print("Quote Similarity Search using Vector Embeddings")
        print("="*80)
        print("\nThis tool finds quotes similar to your input using semantic similarity.")
        print("Type 'quit' or 'exit' to stop.\n")
        
        while True:
            # Get user input
            query = input("\nEnter a phrase or concept to search for similar quotes: ").strip()
            
            # Check for exit
            if query.lower() in ['quit', 'exit', 'q']:
                print("\nGoodbye!")
                break
                
            if not query:
                print("Please enter a valid search query.")
                continue
            
            # Get number of results
            try:
                num_results = input("How many results would you like? (default: 5): ").strip()
                limit = int(num_results) if num_results else 5
                limit = max(1, min(limit, 20))  # Limit between 1 and 20
            except ValueError:
                limit = 5
            
            # Search for similar quotes
            print(f"\nSearching for quotes similar to '{query}'...")
            results = search.search_similar_quotes(query, limit=limit)
            
            # Display results
            search.display_results(query, results)
            
            # Ask if user wants to see more details
            if results:
                print("\n" + "-"*80)
                print("Options:")
                print("1. Search again")
                print("2. Show full quote for a result (enter number)")
                print("3. Exit")
                
                choice = input("\nYour choice (1-3 or result number): ").strip()
                
                if choice == '3':
                    print("\nGoodbye!")
                    break
                elif choice.isdigit() and 1 <= int(choice) <= len(results):
                    # Show full quote
                    idx = int(choice) - 1
                    result = results[idx]
                    print(f"\n{'='*80}")
                    print(f"Full Quote by {result['author']}:")
                    print(f"{'='*80}")
                    print(textwrap.fill(result['quote'], width=80))
                    print(f"\nTags: {', '.join(result['tags'])}")
                    print(f"Similarity Score: {result['score']:.4f}")
                    
    except KeyboardInterrupt:
        print("\n\nInterrupted by user.")
    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        search.close()
        print("\nConnection closed.")

if __name__ == "__main__":
    main()
