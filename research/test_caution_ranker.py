"""Test script for caution ranker - shows sample quotes and tests database connection"""

import asyncio
import sys
from pathlib import Path

# Add the research directory to the path
sys.path.append(str(Path(__file__).parent))

from database import get_session, Quote, Author
from caution_ranker import CautionRanker

def test_database_connection():
    """Test database connection and show sample quotes"""
    print("Testing database connection...")
    
    session = get_session()
    try:
        # Get total count
        total_quotes = session.query(Quote).count()
        total_authors = session.query(Author).count()
        
        print(f"Database contains {total_quotes} quotes from {total_authors} authors")
        
        # Show first 5 quotes as samples
        sample_quotes = session.query(Quote, Author.name).join(Author).limit(5).all()
        
        print("\nSample quotes:")
        print("-" * 80)
        for i, (quote, author_name) in enumerate(sample_quotes, 1):
            quote_preview = quote.quote_text[:100] + "..." if len(quote.quote_text) > 100 else quote.quote_text
            print(f"{i}. ID: {quote.id}")
            print(f"   Author: {author_name}")
            print(f"   Quote: {quote_preview}")
            print()
        
        return True
        
    except Exception as e:
        print(f"Database connection failed: {str(e)}")
        return False
    finally:
        session.close()

async def test_single_quote_evaluation():
    """Test the caution ranking evaluation on a single quote"""
    print("Testing caution ranking evaluation...")
    
    session = get_session()
    try:
        # Get a sample quote
        sample = session.query(Quote, Author.name).join(Author).first()
        
        if not sample:
            print("No quotes found in database")
            return False
        
        quote, author_name = sample
        
        print(f"Testing with quote from {author_name}:")
        print(f'"{quote.quote_text}"')
        print()
        
        # Create ranker instance
        ranker = CautionRanker()
        
        # Evaluate the quote
        ranking = await ranker.evaluate_quote_caution(quote.quote_text, author_name)
        
        if ranking is not None:
            print(f"Caution ranking: {ranking}/10")
            print("Test successful!")
            return True
        else:
            print("Failed to get caution ranking")
            return False
            
    except Exception as e:
        print(f"Test failed: {str(e)}")
        return False
    finally:
        session.close()

async def main():
    """Run all tests"""
    print("=" * 60)
    print("CAUTION RANKER TEST SUITE")
    print("=" * 60)
    
    # Test 1: Database connection
    db_success = test_database_connection()
    
    if not db_success:
        print("Database test failed. Please check your database setup.")
        return
    
    print("\n" + "=" * 60)
    
    # Test 2: Single quote evaluation
    eval_success = await test_single_quote_evaluation()
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Database connection: {'✓ PASS' if db_success else '✗ FAIL'}")
    print(f"Quote evaluation: {'✓ PASS' if eval_success else '✗ FAIL'}")
    
    if db_success and eval_success:
        print("\nAll tests passed! You can now run the full caution ranker:")
        print("python research/caution_ranker.py")
    else:
        print("\nSome tests failed. Please check the errors above.")

if __name__ == '__main__':
    asyncio.run(main())
