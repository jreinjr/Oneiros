"""
Test script to process a single author and verify the complete pipeline works
"""
import asyncio
from author_processor import AuthorProcessor
from data_models import BatchProcessingConfig
from database import get_session, get_author_by_name
from datetime import datetime

async def test_single_author():
    """Test processing a single author"""
    # Configuration for testing
    config = BatchProcessingConfig(
        batch_size=1,
        max_retries=2,
        delay_between_authors=0.0,
        delay_between_batches=0.0,
        skip_existing=False,  # Process even if exists
        quality_threshold=0.2  # Lower threshold for testing
    )
    
    processor = AuthorProcessor(config)
    
    # Test with a single author
    test_author = "Emily Dickinson"
    print(f"Testing with author: {test_author}")
    print("="*50)
    
    # Process the author
    success = await processor.process_single_author(test_author)
    
    if success:
        # Retrieve the author from database
        session = get_session()
        try:
            author = get_author_by_name(session, test_author)
            
            if author:
                print(f"\n{'='*50}")
                print(f"PROCESSING RESULTS FOR {author.name}")
                print(f"{'='*50}")
                print(f"Status: {author.status}")
                print(f"Quality Score: {author.quality_score:.3f}")
                print(f"Processing Date: {author.processing_date}")
                
                if author.biography:
                    print(f"\nBIOGRAPHY:")
                    print(f"Birth Year: {author.birth_year}")
                    print(f"Death Year: {author.death_year}")
                    print(f"Birth Location: {author.birth_location}")
                    print(f"Biography Length: {len(author.biography)} characters")
                    print(f"Biography Preview: {author.biography[:200]}...")
                else:
                    print("\nNo biography generated")
                
                # Access quotes while session is still open
                quotes = author.quotes  # Force load the relationship
                if quotes:
                    print(f"\nQUOTES: {len(quotes)} found")
                    theme_counts = author.get_quote_count_by_theme()
                    for theme, count in theme_counts.items():
                        print(f"  {theme}: {count}")
                    
                    print("\nSample quotes:")
                    for i, quote in enumerate(quotes[:3]):  # Show first 3
                        tags = ", ".join([tag.name for tag in quote.tags])
                        print(f"  {i+1}. \"{quote.quote_text[:100]}{'...' if len(quote.quote_text) > 100 else ''}\"")
                        print(f"     Tags: {tags}")
                        if quote.source_link:
                            print(f"     Source: {quote.source_link}")
                else:
                    print("\nNo quotes generated")
                
                print(f"\n✓ Author successfully saved to database")
                print(f"✓ You can now view this author at: http://localhost:5000/author/{test_author.replace(' ', '_')}")
                
            else:
                print(f"ERROR: Author {test_author} not found in database after processing")
                
        finally:
            session.close()
    else:
        print(f"Failed to process author {test_author}")
        
    # Show processing statistics
    print(f"\n{'='*50}")
    print("PROCESSING STATISTICS")
    print(f"{'='*50}")
    print(f"Total authors processed: {processor.stats['processed']}")
    print(f"Failed: {processor.stats['failed']}")
    print(f"API calls made: {processor.stats['api_calls']}")

if __name__ == '__main__':
    print("Starting single author test...")
    print("This will process one author and add them to the database.")
    print("You can refresh the website to see the author appear in real-time.\n")
    
    asyncio.run(test_single_author())
