#!/usr/bin/env python3
"""
Test script for filter_quotes_by_caution.py
"""

import sys
import os
from pathlib import Path
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add current directory to path
sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.join(os.path.dirname(__file__), 'research'))

from filter_quotes_by_caution import QuoteFilterManager
from database import Quote, Tag


def add_tags_to_csv(csv_path="data/caution_rankings.csv", db_path="data/beliefgraph.db"):
    """Add tags column to CSV by fetching from database"""
    print("Adding tags to CSV...")
    print("-" * 60)
    
    # Load the CSV
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} quotes from CSV")
    
    # Connect to database
    engine = create_engine(f'sqlite:///{db_path}')
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Initialize tags column
        tags_list = []
        
        # For each quote in the CSV
        for idx, row in df.iterrows():
            quote_id = row['id']
            
            # Fetch the quote from database
            quote = session.query(Quote).filter_by(id=quote_id).first()
            
            if quote:
                # Get tags for this quote
                tag_names = [tag.name for tag in quote.tags]
                # Sort tags in a consistent order
                tag_names.sort()
                # Join with comma separator
                tags_str = ', '.join(tag_names)
                tags_list.append(tags_str)
            else:
                tags_list.append('')  # Empty string if quote not found
                print(f"Warning: Quote ID {quote_id} not found in database")
        
        # Add tags column to dataframe
        df['tags'] = tags_list
        
        # Save the updated CSV
        df.to_csv(csv_path, index=False)
        
        # Print summary
        print(f"\n✓ Added tags column to CSV")
        print(f"✓ Saved updated CSV to {csv_path}")
        
        # Show tag distribution
        print("\nTag distribution:")
        tag_counts = {'truth': 0, 'love': 0, 'beauty': 0, 'no_tags': 0}
        for tags in tags_list:
            if not tags:
                tag_counts['no_tags'] += 1
            else:
                for tag in ['truth', 'love', 'beauty']:
                    if tag in tags:
                        tag_counts[tag] += 1
        
        for tag, count in tag_counts.items():
            print(f"   {tag}: {count} quotes")
            
    except Exception as e:
        print(f"\n❌ Error adding tags: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        session.close()
    
    return True


def test_basic_functionality():
    """Test basic functionality of the quote filter manager"""
    print("Testing Quote Filter Manager...")
    print("-" * 60)
    
    # Initialize manager
    manager = QuoteFilterManager()
    
    try:
        # Test 1: Load CSV and get metrics
        print("\n1. Testing CSV loading and metrics...")
        df = manager.load_csv()
        print(f"   ✓ Loaded {len(df)} quotes")
        
        metrics = manager.get_metrics()
        print(f"   ✓ Calculated metrics successfully")
        print(f"   - Average caution ranking: {metrics['average_caution_ranking']:.2f}")
        print(f"   - Quotes marked for removal: {metrics['quotes_marked_for_removal']}")
        
        # Test 2: Print full metrics report
        print("\n2. Full metrics report:")
        manager.print_metrics(metrics)
        
        print("\n✅ All tests passed!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


def main():
    """Main function with options"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test script for filter_quotes_by_caution.py")
    parser.add_argument('--add-tags', action='store_true', 
                       help='Add tags column to CSV from database')
    parser.add_argument('--csv', default='data/caution_rankings.csv',
                       help='Path to CSV file (default: data/caution_rankings.csv)')
    parser.add_argument('--db', default='data/beliefgraph.db',
                       help='Path to database file (default: data/beliefgraph.db)')
    
    args = parser.parse_args()
    
    if args.add_tags:
        success = add_tags_to_csv(csv_path=args.csv, db_path=args.db)
        return 0 if success else 1
    else:
        return test_basic_functionality()


if __name__ == '__main__':
    sys.exit(main())
