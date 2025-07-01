"""Migrate BeliefGraph data from SQLite to Neo4j"""

import os
import sys
from neo4j import GraphDatabase
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from research.database import Base, Author, Quote, Tag, get_database_url
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class Neo4jMigration:
    def __init__(self, uri, username, password):
        """Initialize Neo4j connection"""
        self.driver = GraphDatabase.driver(uri, auth=(username, password))
        logger.info(f"Connected to Neo4j at {uri}")
        
    def close(self):
        """Close Neo4j connection"""
        self.driver.close()
        
    def clear_database(self):
        """Clear all nodes and relationships in Neo4j (optional)"""
        with self.driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
            logger.info("Cleared Neo4j database")
            
    def create_constraints(self):
        """Create uniqueness constraints"""
        with self.driver.session() as session:
            # Create constraint for Author names
            try:
                session.run("""
                    CREATE CONSTRAINT author_name_unique IF NOT EXISTS
                    FOR (a:Author) REQUIRE a.name IS UNIQUE
                """)
                logger.info("Created Author name uniqueness constraint")
            except Exception as e:
                logger.warning(f"Constraint may already exist: {e}")
                
    def migrate_authors(self, sql_session):
        """Migrate all authors from SQLite to Neo4j"""
        authors = sql_session.query(Author).all()
        logger.info(f"Found {len(authors)} authors to migrate")
        
        with self.driver.session() as neo4j_session:
            for author in authors:
                # Create Author node
                result = neo4j_session.run("""
                    MERGE (a:Author {name: $name})
                    RETURN a
                """, name=author.name)
                
                logger.info(f"Created/Updated Author: {author.name}")
                
        return authors
    
    def migrate_quotes(self, sql_session, authors):
        """Migrate all quotes and create relationships"""
        total_quotes = 0
        
        with self.driver.session() as neo4j_session:
            for author in authors:
                quotes = author.quotes
                logger.info(f"Processing {len(quotes)} quotes for {author.name}")
                
                for quote in quotes:
                    # Get tag names
                    tag_names = [tag.name for tag in quote.tags]
                    
                    # Create Quote node
                    result = neo4j_session.run("""
                        CREATE (q:Quote {
                            text: $text,
                            author_name: $author_name,
                            tags: $tags,
                            source_link: $source_link
                        })
                        RETURN q
                    """, 
                    text=quote.quote_text,
                    author_name=author.name,
                    tags=tag_names,
                    source_link=quote.source_link or ""
                    )
                    
                    # Create WRITTEN_BY relationship to Author
                    neo4j_session.run("""
                        MATCH (q:Quote {text: $text, author_name: $author_name})
                        MATCH (a:Author {name: $author_name})
                        MERGE (q)-[:WRITTEN_BY]->(a)
                        MERGE (a)-[:WROTE]->(q)
                    """,
                    text=quote.quote_text,
                    author_name=author.name
                    )
                    
                    total_quotes += 1
                
                # Create SAME_AUTHOR relationships between quotes from the same author
                if len(quotes) > 1:
                    neo4j_session.run("""
                        MATCH (q1:Quote {author_name: $author_name})
                        MATCH (q2:Quote {author_name: $author_name})
                        WHERE id(q1) < id(q2)
                        MERGE (q1)-[:SAME_AUTHOR]-(q2)
                    """, author_name=author.name)
                    
                    logger.info(f"Created SAME_AUTHOR relationships for {author.name}")
                    
        logger.info(f"Total quotes migrated: {total_quotes}")
        
    def verify_migration(self):
        """Run verification queries to check migration success"""
        with self.driver.session() as session:
            # Count nodes
            author_count = session.run("MATCH (a:Author) RETURN count(a) as count").single()["count"]
            quote_count = session.run("MATCH (q:Quote) RETURN count(q) as count").single()["count"]
            
            # Count relationships
            written_by_count = session.run("MATCH ()-[r:WRITTEN_BY]->() RETURN count(r) as count").single()["count"]
            wrote_count = session.run("MATCH ()-[r:WROTE]->() RETURN count(r) as count").single()["count"]
            same_author_count = session.run("MATCH ()-[r:SAME_AUTHOR]-() RETURN count(r) as count").single()["count"]
            
            # Sample queries
            sample_quotes = session.run("""
                MATCH (q:Quote)-[:WRITTEN_BY]->(a:Author)
                RETURN a.name as author, q.text as quote, q.tags as tags
                LIMIT 5
            """).data()
            
            logger.info("\n=== Migration Verification ===")
            logger.info(f"Authors: {author_count}")
            logger.info(f"Quotes: {quote_count}")
            logger.info(f"WRITTEN_BY relationships: {written_by_count}")
            logger.info(f"WROTE relationships: {wrote_count}")
            logger.info(f"SAME_AUTHOR relationships: {same_author_count // 2}")  # Divided by 2 because bidirectional
            
            logger.info("\nSample quotes:")
            for sample in sample_quotes:
                logger.info(f"- {sample['author']}: \"{sample['quote'][:50]}...\" Tags: {sample['tags']}")
                
            # Check for quotes by theme
            for theme in ['truth', 'love', 'beauty']:
                theme_count = session.run("""
                    MATCH (q:Quote)
                    WHERE $theme IN q.tags
                    RETURN count(q) as count
                """, theme=theme).single()["count"]
                logger.info(f"Quotes tagged '{theme}': {theme_count}")

def main():
    """Main migration function"""
    # Neo4j connection details
    NEO4J_URI = "neo4j://127.0.0.1:7687"
    NEO4J_USERNAME = "neo4j"
    NEO4J_PASSWORD = "#$ER34er"
    
    # Initialize SQLite connection
    engine = create_engine(get_database_url())
    Session = sessionmaker(bind=engine)
    sql_session = Session()
    
    # Initialize Neo4j migration
    migration = Neo4jMigration(NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD)
    
    try:
        # Optional: Clear existing data (uncomment if needed)
        # logger.info("Clearing existing Neo4j data...")
        # migration.clear_database()
        
        # Create constraints
        logger.info("Creating constraints...")
        migration.create_constraints()
        
        # Migrate authors
        logger.info("Starting author migration...")
        authors = migration.migrate_authors(sql_session)
        
        # Migrate quotes and create relationships
        logger.info("Starting quote migration...")
        migration.migrate_quotes(sql_session, authors)
        
        # Verify migration
        logger.info("Verifying migration...")
        migration.verify_migration()
        
        logger.info("\n=== Migration completed successfully! ===")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise
    finally:
        sql_session.close()
        migration.close()

if __name__ == "__main__":
    main()
