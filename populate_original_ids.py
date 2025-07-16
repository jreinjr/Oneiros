#!/usr/bin/env python3
"""
Script to populate original_id field in Quote table from CSV data.
This preserves the original CSV IDs for consistent references.
"""

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import sys
import os

# Add research directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'research'))
from database import Quote, get_database_url

def populate_original_ids(csv_path="data/caution_rankings.csv", db_path="data/beliefgraph_filtered.db"):
    """Populate original_id field from CSV data"""
    print(f"Loading CSV from {csv_path}...")
    
    # Load CSV
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} quotes from CSV")
    
    # Connect to database
    engine = create_engine(f'sqlite:///{db_path}')
    print(f"Connecting to database: {db_path}")
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Add original_id column to database if it doesn't exist
        # This is safe to run multiple times
        result = session.execute(text("PRAGMA table_info(quotes)"))
        columns = [row[1] for row in result.fetchall()]
        
        if 'original_id' not in columns:
            print("Adding original_id column to quotes table...")
            session.execute(text("ALTER TABLE quotes ADD COLUMN original_id INTEGER"))
            session.commit()
        
        # For each quote in CSV, update the corresponding database quote
        updated_count = 0
        not_found_count = 0
        
        for idx, row in df.iterrows():
            csv_id = row['id']
            quote_text = row['quote']
            author_name = row['author']
            
            # Find matching quote in database by text and author
            quote = session.query(Quote).filter(
                Quote.quote_text == quote_text
            ).first()
            
            if quote:
                quote.original_id = csv_id
                updated_count += 1
                if updated_count % 100 == 0:
                    print(f"Updated {updated_count} quotes...")
            else:
                not_found_count += 1
                print(f"Warning: Quote ID {csv_id} not found in database")
                print(f"  Author: {author_name}")
                print(f"  Text: {quote_text[:50]}...")
        
        session.commit()
        
        print(f"\n✓ Successfully updated {updated_count} quotes with original IDs")
        if not_found_count > 0:
            print(f"⚠ {not_found_count} quotes from CSV were not found in database")
        
        # Verify the update
        quotes_with_original_id = session.query(Quote).filter(Quote.original_id.isnot(None)).count()
        total_quotes = session.query(Quote).count()
        print(f"\nDatabase now has {quotes_with_original_id}/{total_quotes} quotes with original IDs")
        
    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
        raise
    finally:
        session.close()

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Populate original_id field from CSV data")
    parser.add_argument('--csv', default='data/caution_rankings.csv',
                       help='Path to CSV file (default: data/caution_rankings.csv)')
    parser.add_argument('--db', default='data/beliefgraph_filtered.db',
                       help='Path to database file (default: data/beliefgraph_filtered.db)')
    
    args = parser.parse_args()
    
    populate_original_ids(csv_path=args.csv, db_path=args.db)

if __name__ == '__main__':
    main()