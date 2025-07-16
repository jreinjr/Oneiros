#!/usr/bin/env python3
"""
Filter quotes from beliefgraph.db based on caution rankings.

This script:
1. Loads caution rankings from CSV and reports metrics
2. Allows marking quotes for removal based on caution threshold
3. Creates a filtered database with only approved quotes
"""

import csv
import os
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import shutil
from collections import Counter

# Add research directory to path to import database models
sys.path.append(os.path.join(os.path.dirname(__file__), 'research'))
from database import Base, Author, Quote, Tag, get_session, init_database


class QuoteFilterManager:
    """Manages filtering of quotes based on caution rankings"""
    
    def __init__(self, csv_path: str = "data/caution_rankings.csv"):
        self.csv_path = Path(csv_path)
        self.df = None
        self.original_db_path = Path("data/beliefgraph.db")
        self.filtered_db_path = Path("data/beliefgraph_filtered.db")
        
    def load_csv(self) -> pd.DataFrame:
        """Load the caution rankings CSV file"""
        if not self.csv_path.exists():
            raise FileNotFoundError(f"CSV file not found: {self.csv_path}")
        
        # Read CSV with proper column names based on the example structure
        self.df = pd.read_csv(self.csv_path)
        
        # Ensure required columns exist
        required_columns = ['caution_ranking', 'to_remove', 'id', 'author', 'quote']
        missing_columns = [col for col in required_columns if col not in self.df.columns]
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}")
        
        # Clean up the data
        self.df['caution_ranking'] = pd.to_numeric(self.df['caution_ranking'], errors='coerce')
        self.df['to_remove'] = self.df['to_remove'].fillna('')
        
        print(f"✓ Loaded {len(self.df)} quotes from {self.csv_path}")
        return self.df
    
    def get_metrics(self) -> Dict:
        """Calculate and return metrics about the quotes"""
        if self.df is None:
            self.load_csv()
        
        # Add character count column
        self.df['char_count'] = self.df['quote'].str.len()
        
        metrics = {
            'total_quotes': len(self.df),
            'quotes_with_rankings': self.df['caution_ranking'].notna().sum(),
            'quotes_without_rankings': self.df['caution_ranking'].isna().sum(),
            'average_caution_ranking': self.df['caution_ranking'].mean(),
            'median_caution_ranking': self.df['caution_ranking'].median(),
            'std_caution_ranking': self.df['caution_ranking'].std(),
            'min_caution_ranking': self.df['caution_ranking'].min(),
            'max_caution_ranking': self.df['caution_ranking'].max(),
            'quotes_marked_for_removal': (self.df['to_remove'] == 'x').sum(),
            'quotes_after_removal': len(self.df[self.df['to_remove'] != 'x']),
            'ranking_distribution': dict(self.df['caution_ranking'].value_counts().sort_index()),
            'authors_total': self.df['author'].nunique(),
            'authors_after_removal': self.df[self.df['to_remove'] != 'x']['author'].nunique(),
            'average_char_count': self.df['char_count'].mean(),
            'median_char_count': self.df['char_count'].median(),
            'min_char_count': self.df['char_count'].min(),
            'max_char_count': self.df['char_count'].max()
        }
        
        # Calculate removal percentage
        if metrics['total_quotes'] > 0:
            metrics['removal_percentage'] = (metrics['quotes_marked_for_removal'] / metrics['total_quotes']) * 100
        else:
            metrics['removal_percentage'] = 0
        
        return metrics
    
    def print_metrics(self, metrics: Dict):
        """Print metrics in a formatted way"""
        print("\n" + "="*60)
        print("QUOTE METRICS REPORT")
        print("="*60)
        
        print(f"\n📊 OVERALL STATISTICS:")
        print(f"   Total quotes: {metrics['total_quotes']:,}")
        print(f"   Quotes with rankings: {metrics['quotes_with_rankings']:,}")
        print(f"   Quotes without rankings: {metrics['quotes_without_rankings']:,}")
        print(f"   Total authors: {metrics['authors_total']:,}")
        
        print(f"\n📈 CAUTION RANKING STATISTICS:")
        print(f"   Average ranking: {metrics['average_caution_ranking']:.2f}")
        print(f"   Median ranking: {metrics['median_caution_ranking']:.1f}")
        print(f"   Standard deviation: {metrics['std_caution_ranking']:.2f}")
        print(f"   Range: {metrics['min_caution_ranking']:.0f} - {metrics['max_caution_ranking']:.0f}")
        
        print(f"\n📊 RANKING DISTRIBUTION:")
        for ranking in sorted(metrics['ranking_distribution'].keys()):
            count = metrics['ranking_distribution'][ranking]
            percentage = (count / metrics['quotes_with_rankings']) * 100
            bar = "█" * int(percentage / 2)  # Scale bar to fit
            print(f"   Ranking {ranking:2.0f}: {count:4d} quotes ({percentage:5.1f}%) {bar}")
        
        print(f"\n📏 CHARACTER COUNT STATISTICS:")
        print(f"   Average length: {metrics['average_char_count']:.0f} characters")
        print(f"   Median length: {metrics['median_char_count']:.0f} characters")
        print(f"   Range: {metrics['min_char_count']:.0f} - {metrics['max_char_count']:.0f} characters")
        
        print(f"\n🗑️  REMOVAL STATISTICS:")
        print(f"   Quotes marked for removal: {metrics['quotes_marked_for_removal']:,}")
        print(f"   Removal percentage: {metrics['removal_percentage']:.1f}%")
        print(f"   Quotes after removal: {metrics['quotes_after_removal']:,}")
        print(f"   Authors after removal: {metrics['authors_after_removal']:,}")
        
        print("="*60 + "\n")
    
    def mark_for_removal_above_threshold(self, threshold: float) -> int:
        """Mark all quotes with caution ranking above threshold for removal"""
        if self.df is None:
            self.load_csv()
        
        # Count how many will be marked
        to_mark = (self.df['caution_ranking'] > threshold) & (self.df['to_remove'] != 'x')
        count_to_mark = to_mark.sum()
        
        # Mark them
        self.df.loc[self.df['caution_ranking'] > threshold, 'to_remove'] = 'x'
        
        # Save the updated CSV
        self.df.to_csv(self.csv_path, index=False)
        
        print(f"✓ Marked {count_to_mark} additional quotes for removal (caution_ranking > {threshold})")
        print(f"✓ Updated CSV saved to {self.csv_path}")
        
        return count_to_mark
    
    def mark_for_removal_by_char_count(self, min_chars: Optional[int] = None, max_chars: Optional[int] = None) -> int:
        """Mark quotes for removal based on character count"""
        if self.df is None:
            self.load_csv()
        
        # Add character count column if not present
        if 'char_count' not in self.df.columns:
            self.df['char_count'] = self.df['quote'].str.len()
        
        # Build condition for marking
        conditions = []
        if min_chars is not None:
            conditions.append(self.df['char_count'] < min_chars)
        if max_chars is not None:
            conditions.append(self.df['char_count'] > max_chars)
        
        if not conditions:
            print("❌ No character count criteria specified")
            return 0
        
        # Combine conditions with OR
        to_mark_condition = conditions[0]
        for cond in conditions[1:]:
            to_mark_condition = to_mark_condition | cond
        
        # Only mark quotes not already marked
        to_mark = to_mark_condition & (self.df['to_remove'] != 'x')
        count_to_mark = to_mark.sum()
        
        # Mark them
        self.df.loc[to_mark_condition, 'to_remove'] = 'x'
        
        # Save the updated CSV
        self.df.to_csv(self.csv_path, index=False)
        
        criteria = []
        if min_chars is not None:
            criteria.append(f"< {min_chars} chars")
        if max_chars is not None:
            criteria.append(f"> {max_chars} chars")
        
        print(f"✓ Marked {count_to_mark} additional quotes for removal ({' or '.join(criteria)})")
        print(f"✓ Updated CSV saved to {self.csv_path}")
        
        return count_to_mark
    
    def create_filtered_database(self) -> Dict:
        """Create a new database file with only the quotes not marked for removal"""
        if self.df is None:
            self.load_csv()
        
        # Get IDs of quotes to keep
        quotes_to_keep = self.df[self.df['to_remove'] != 'x']['id'].tolist()
        
        if not quotes_to_keep:
            print("❌ No quotes to keep! All quotes are marked for removal.")
            return {}
        
        print(f"\n🔄 Creating filtered database...")
        print(f"   Keeping {len(quotes_to_keep)} out of {len(self.df)} quotes")
        
        # Copy the original database
        if self.filtered_db_path.exists():
            self.filtered_db_path.unlink()
        shutil.copy2(self.original_db_path, self.filtered_db_path)
        
        # Connect to the filtered database
        engine = create_engine(f'sqlite:///{self.filtered_db_path}')
        Session = sessionmaker(bind=engine)
        session = Session()
        
        try:
            # Delete quotes not in the keep list
            quotes_to_delete = session.query(Quote).filter(~Quote.id.in_(quotes_to_keep)).all()
            delete_count = len(quotes_to_delete)
            
            for quote in quotes_to_delete:
                session.delete(quote)
            
            session.commit()
            
            # Get metrics about the filtered database
            total_quotes = session.query(Quote).count()
            total_authors = session.query(Author).count()
            
            # Count authors with at least one quote
            authors_with_quotes = session.query(Author).join(Quote).distinct().count()
            
            # Get theme distribution
            theme_counts = {}
            for tag in session.query(Tag).all():
                count = len(tag.quotes)
                if count > 0:
                    theme_counts[tag.name] = count
            
            metrics = {
                'original_quotes': len(self.df),
                'deleted_quotes': delete_count,
                'remaining_quotes': total_quotes,
                'total_authors': total_authors,
                'authors_with_quotes': authors_with_quotes,
                'theme_distribution': theme_counts,
                'database_path': str(self.filtered_db_path)
            }
            
            # Print results
            print(f"\n✅ FILTERED DATABASE CREATED SUCCESSFULLY!")
            print(f"   Path: {self.filtered_db_path}")
            print(f"\n📊 FILTERED DATABASE METRICS:")
            print(f"   Original quotes: {metrics['original_quotes']:,}")
            print(f"   Deleted quotes: {metrics['deleted_quotes']:,}")
            print(f"   Remaining quotes: {metrics['remaining_quotes']:,}")
            print(f"   Total authors: {metrics['total_authors']:,}")
            print(f"   Authors with quotes: {metrics['authors_with_quotes']:,}")
            
            if theme_counts:
                print(f"\n🏷️  THEME DISTRIBUTION:")
                for theme, count in sorted(theme_counts.items()):
                    print(f"   {theme}: {count:,} quotes")
            
            return metrics
            
        except Exception as e:
            session.rollback()
            print(f"❌ Error creating filtered database: {str(e)}")
            raise
        finally:
            session.close()


def main():
    """Main function with command line interface"""
    parser = argparse.ArgumentParser(
        description="Filter quotes based on caution rankings and character count",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Show metrics only
  python filter_quotes_by_caution.py
  
  # Mark quotes with caution > 5 for removal
  python filter_quotes_by_caution.py --threshold 5
  
  # Mark quotes shorter than 50 or longer than 500 characters
  python filter_quotes_by_caution.py --min-chars 50 --max-chars 500
  
  # Combine filters: caution > 5 OR length outside 50-500 chars
  python filter_quotes_by_caution.py --threshold 5 --min-chars 50 --max-chars 500
  
  # Create filtered database
  python filter_quotes_by_caution.py --create-db
  
  # Full workflow: apply filters and create database
  python filter_quotes_by_caution.py --threshold 5 --min-chars 50 --max-chars 500 --create-db
        """
    )
    
    parser.add_argument(
        '--csv', 
        default='data/caution_rankings.csv',
        help='Path to caution rankings CSV file (default: data/caution_rankings.csv)'
    )
    
    parser.add_argument(
        '--threshold', 
        type=float,
        help='Mark quotes with caution ranking above this threshold for removal'
    )
    
    parser.add_argument(
        '--min-chars', 
        type=int,
        help='Mark quotes with fewer than this many characters for removal'
    )
    
    parser.add_argument(
        '--max-chars', 
        type=int,
        help='Mark quotes with more than this many characters for removal'
    )
    
    parser.add_argument(
        '--create-db', 
        action='store_true',
        help='Create filtered database excluding marked quotes'
    )
    
    args = parser.parse_args()
    
    # Initialize manager
    manager = QuoteFilterManager(csv_path=args.csv)
    
    try:
        # Load CSV and show metrics
        manager.load_csv()
        metrics = manager.get_metrics()
        manager.print_metrics(metrics)
        
        # Track if any marking was done
        total_marked = 0
        
        # Mark for removal if threshold provided
        if args.threshold is not None:
            print(f"\n🎯 Applying caution threshold: {args.threshold}")
            marked_count = manager.mark_for_removal_above_threshold(args.threshold)
            total_marked += marked_count
        
        # Mark for removal based on character count
        if args.min_chars is not None or args.max_chars is not None:
            print(f"\n📏 Applying character count filters:")
            if args.min_chars is not None:
                print(f"   Minimum characters: {args.min_chars}")
            if args.max_chars is not None:
                print(f"   Maximum characters: {args.max_chars}")
            marked_count = manager.mark_for_removal_by_char_count(
                min_chars=args.min_chars,
                max_chars=args.max_chars
            )
            total_marked += marked_count
        
        # Show updated metrics if any marking was done
        if total_marked > 0:
            print("\n📊 UPDATED METRICS AFTER ALL FILTERS:")
            updated_metrics = manager.get_metrics()
            print(f"   Total marked for removal: {updated_metrics['quotes_marked_for_removal']:,}")
            print(f"   Quotes remaining: {updated_metrics['quotes_after_removal']:,}")
            print(f"   Removal percentage: {updated_metrics['removal_percentage']:.1f}%")
        
        # Create filtered database if requested
        if args.create_db:
            db_metrics = manager.create_filtered_database()
            
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return 1
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
