"""Sample Neo4j queries to explore the migrated BeliefGraph data"""

from neo4j import GraphDatabase
import json

class Neo4jExplorer:
    def __init__(self, uri, username, password):
        """Initialize Neo4j connection"""
        self.driver = GraphDatabase.driver(uri, auth=(username, password))
        
    def close(self):
        """Close Neo4j connection"""
        self.driver.close()
        
    def run_query(self, query_name, cypher_query, parameters=None):
        """Run a Cypher query and display results"""
        print(f"\n{'='*60}")
        print(f"Query: {query_name}")
        print(f"{'='*60}")
        
        with self.driver.session() as session:
            result = session.run(cypher_query, parameters or {})
            records = list(result)
            
            if records:
                for i, record in enumerate(records[:10]):  # Show first 10 results
                    print(f"\nResult {i+1}:")
                    for key, value in record.items():
                        if isinstance(value, list):
                            print(f"  {key}: {', '.join(map(str, value))}")
                        else:
                            print(f"  {key}: {value}")
                
                if len(records) > 10:
                    print(f"\n... and {len(records) - 10} more results")
            else:
                print("No results found")
                
            return records

def main():
    # Neo4j connection details
    NEO4J_URI = "neo4j://127.0.0.1:7687"
    NEO4J_USERNAME = "neo4j"
    NEO4J_PASSWORD = "#$ER34er"
    
    explorer = Neo4jExplorer(NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD)
    
    try:
        # 1. Get all authors
        explorer.run_query(
            "All Authors (first 10)",
            "MATCH (a:Author) RETURN a.name as author ORDER BY a.name LIMIT 10"
        )
        
        # 2. Find quotes by a specific author
        explorer.run_query(
            "Quotes by Rumi",
            """
            MATCH (q:Quote)-[:WRITTEN_BY]->(a:Author {name: 'Rumi'})
            RETURN q.text as quote, q.tags as tags
            LIMIT 5
            """
        )
        
        # 3. Find all quotes tagged with 'love'
        explorer.run_query(
            "Quotes about Love (first 5)",
            """
            MATCH (q:Quote)
            WHERE 'love' IN q.tags
            RETURN q.text as quote, q.author_name as author
            LIMIT 5
            """
        )
        
        # 4. Authors with the most quotes
        explorer.run_query(
            "Top 10 Authors by Quote Count",
            """
            MATCH (a:Author)<-[:WRITTEN_BY]-(q:Quote)
            RETURN a.name as author, count(q) as quote_count
            ORDER BY quote_count DESC
            LIMIT 10
            """
        )
        
        # 5. Find quotes with multiple tags
        explorer.run_query(
            "Quotes with Multiple Themes",
            """
            MATCH (q:Quote)
            WHERE size(q.tags) > 1
            RETURN q.text as quote, q.author_name as author, q.tags as tags
            LIMIT 5
            """
        )
        
        # 6. Find connected quotes (same author)
        explorer.run_query(
            "Connected Quotes from Same Author",
            """
            MATCH (q1:Quote)-[:SAME_AUTHOR]-(q2:Quote)
            WHERE q1.author_name = 'Emily Dickinson'
            RETURN q1.text as quote1, q2.text as quote2
            LIMIT 3
            """
        )
        
        # 7. Theme distribution
        explorer.run_query(
            "Quote Distribution by Theme",
            """
            UNWIND ['truth', 'love', 'beauty'] as theme
            MATCH (q:Quote)
            WHERE theme IN q.tags
            RETURN theme, count(q) as count
            ORDER BY count DESC
            """
        )
        
        # 8. Authors who write about all three themes
        explorer.run_query(
            "Authors Writing About All Three Themes",
            """
            MATCH (a:Author)<-[:WRITTEN_BY]-(q:Quote)
            WITH a, collect(DISTINCT q.tags) as all_tags
            WHERE any(tags IN all_tags WHERE 'truth' IN tags) 
              AND any(tags IN all_tags WHERE 'love' IN tags)
              AND any(tags IN all_tags WHERE 'beauty' IN tags)
            RETURN a.name as author
            LIMIT 10
            """
        )
        
        # 9. Find quotes about both truth and beauty
        explorer.run_query(
            "Quotes about Truth AND Beauty",
            """
            MATCH (q:Quote)
            WHERE 'truth' IN q.tags AND 'beauty' IN q.tags
            RETURN q.text as quote, q.author_name as author
            LIMIT 5
            """
        )
        
        # 10. Graph statistics
        print(f"\n{'='*60}")
        print("Graph Statistics")
        print(f"{'='*60}")
        
        with explorer.driver.session() as session:
            # Node counts
            author_count = session.run("MATCH (a:Author) RETURN count(a) as count").single()["count"]
            quote_count = session.run("MATCH (q:Quote) RETURN count(q) as count").single()["count"]
            
            # Relationship counts
            written_by = session.run("MATCH ()-[r:WRITTEN_BY]->() RETURN count(r) as count").single()["count"]
            wrote = session.run("MATCH ()-[r:WROTE]->() RETURN count(r) as count").single()["count"]
            same_author = session.run("MATCH ()-[r:SAME_AUTHOR]-() RETURN count(DISTINCT r) as count").single()["count"]
            
            print(f"\nNodes:")
            print(f"  Authors: {author_count}")
            print(f"  Quotes: {quote_count}")
            print(f"\nRelationships:")
            print(f"  WRITTEN_BY: {written_by}")
            print(f"  WROTE: {wrote}")
            print(f"  SAME_AUTHOR: {same_author}")
            
    finally:
        explorer.close()

if __name__ == "__main__":
    main()
