"""
Test script to process multiple authors in batch and watch the database grow
"""
import asyncio
from author_processor import AuthorProcessor
from data_models import BatchProcessingConfig
from database import get_session, get_all_authors
from datetime import datetime
import time

async def test_batch_authors():
    """Test processing a batch of 5 authors"""
    # Configuration for batch testing
    config = BatchProcessingConfig(
        batch_size=5,
        max_retries=2,
        delay_between_authors=2.0,  # 2 seconds between authors
        delay_between_batches=5.0,  # 5 seconds between batches
        skip_existing=True,  # Skip if already processed
        quality_threshold=0.3
    )
    
    processor = AuthorProcessor(config)
    
    # Select 5 authors to test
    test_authors = [
        "John Keats",
        "Walt Whitman", 
        "Rumi",
        "Maya Angelou",
        "Oscar Wilde"
    ]
    
    print("BATCH AUTHOR PROCESSING TEST")
    print("="*60)
    print(f"Processing {len(test_authors)} authors:")
    for i, author in enumerate(test_authors, 1):
        print(f"  {i}. {author}")
    print("\nYou can refresh http://localhost:5000 to see authors appear in real-time!")
    print("="*60)
    
    # Get initial count
    session = get_session()
    initial_count = len(get_all_authors(session))
    session.close()
    print(f"\nInitial authors in database: {initial_count}")
    
    # Process each author individually to show progress
    for i, author_name in enumerate(test_authors):
        print(f"\n[{i+1}/{len(test_authors)}] Processing {author_name}...")
        start_time = time.time()
        
        success = await processor.process_single_author(author_name)
        
        duration = time.time() - start_time
        
        if success:
            # Check current database count
            session = get_session()
            current_count = len(get_all_authors(session))
            session.close()
            
            print(f"  ✓ Successfully processed in {duration:.1f}s")
            print(f"  ✓ Total authors in database: {current_count}")
            print(f"  ✓ View at: http://localhost:5000/author/{author_name.replace(' ', '_')}")
        else:
            print(f"  ✗ Failed to process {author_name}")
        
        # Add delay between authors (except for the last one)
        if i < len(test_authors) - 1 and config.delay_between_authors > 0:
            print(f"\n  Waiting {config.delay_between_authors}s before next author...")
            await asyncio.sleep(config.delay_between_authors)
    
    # Final statistics
    session = get_session()
    final_count = len(get_all_authors(session))
    all_authors = get_all_authors(session)
    
    print(f"\n{'='*60}")
    print("BATCH PROCESSING COMPLETE")
    print(f"{'='*60}")
    print(f"Authors processed in this batch: {processor.stats['processed']}")
    print(f"Authors skipped (already existed): {processor.stats['skipped']}")
    print(f"Failed: {processor.stats['failed']}")
    print(f"Total API calls: {processor.stats['api_calls']}")
    print(f"\nTotal authors now in database: {final_count}")
    print(f"New authors added: {final_count - initial_count}")
    
    # Show theme distribution (keep session open for lazy loading)
    print("\nTheme Distribution Across All Authors:")
    total_quotes = {'truth': 0, 'love': 0, 'beauty': 0}
    for author in all_authors:
        counts = author.get_quote_count_by_theme()
        for theme, count in counts.items():
            total_quotes[theme] += count
    
    for theme, count in total_quotes.items():
        print(f"  {theme.capitalize()}: {count} quotes")
    
    print(f"\n✓ Visit http://localhost:5000 to see all authors!")
    
    # Close session after we're done accessing relationships
    session.close()

async def test_custom_batch():
    """Test with custom author selection"""
    print("\nCUSTOM BATCH TEST")
    print("="*60)
    print("Enter author names (one per line, empty line to finish):")
    
    custom_authors = []
    while True:
        author = input("> ").strip()
        if not author:
            break
        custom_authors.append(author)
    
    if not custom_authors:
        print("No authors selected.")
        return
    
    config = BatchProcessingConfig(
        batch_size=len(custom_authors),
        max_retries=2,
        delay_between_authors=2.0,
        delay_between_batches=5.0,
        skip_existing=False,  # Process even if exists
        quality_threshold=0.3
    )
    
    processor = AuthorProcessor(config)
    
    print(f"\nProcessing {len(custom_authors)} authors...")
    
    for i, author_name in enumerate(custom_authors):
        print(f"\n[{i+1}/{len(custom_authors)}] Processing {author_name}...")
        success = await processor.process_single_author(author_name)
        
        if success:
            print(f"  ✓ Successfully processed {author_name}")
        else:
            print(f"  ✗ Failed to process {author_name}")
        
        if i < len(custom_authors) - 1:
            await asyncio.sleep(config.delay_between_authors)

if __name__ == '__main__':
    import sys
    
    print("BeliefGraph Batch Author Processing Test")
    print("========================================\n")
    
    if len(sys.argv) > 1 and sys.argv[1] == '--custom':
        asyncio.run(test_custom_batch())
    else:
        print("This will process 5 pre-selected authors.")
        print("Run with --custom flag to choose your own authors.\n")
        asyncio.run(test_batch_authors())
