from dotenv import load_dotenv
load_dotenv()

import csv
import os
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict
import time

from data_models import (
    ProcessingStatus, 
    BatchProcessingConfig,
    ProcessingLog
)
from bibliography_generator import generate_bibliography
from quote_generator import generate_quotes
from database import (
    get_session, 
    get_author_by_name, 
    get_tag_by_name,
    Author, 
    Quote, 
    Tag
)

# Ensure logs directory exists
logs_dir = Path("data/logs")
logs_dir.mkdir(parents=True, exist_ok=True)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(logs_dir / 'processing.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class AuthorProcessor:
    """Main class for processing authors from CSV to database"""
    
    def __init__(self, config: BatchProcessingConfig = None):
        self.config = config or BatchProcessingConfig()
        self.logs_dir = Path("data/logs")
        self.sources_file = Path("data/sources.csv")
        
        # Ensure directories exist
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        
        # Processing statistics
        self.stats = {
            "total_authors": 0,
            "processed": 0,
            "failed": 0,
            "skipped": 0,
            "api_calls": 0,
            "start_time": None,
            "end_time": None
        }
    
    
    def load_authors_from_csv(self) -> List[str]:
        """Load author names from the CSV file"""
        authors = []
        try:
            with open(self.sources_file, 'r', encoding='utf-8') as file:
                reader = csv.reader(file)
                for row in reader:
                    if row and row[0].strip():  # Skip empty rows
                        authors.append(row[0].strip())
            
            logger.info(f"Loaded {len(authors)} authors from {self.sources_file}")
            return authors
            
        except FileNotFoundError:
            logger.error(f"Sources file not found: {self.sources_file}")
            return []
        except Exception as e:
            logger.error(f"Error reading sources file: {str(e)}")
            return []
    
    def get_processed_authors(self) -> set:
        """Get set of already processed author names from database"""
        session = get_session()
        try:
            authors = session.query(Author.name).all()
            return {author.name for author in authors}
        finally:
            session.close()
    
    def save_author_to_database(self, author_name: str, bibliography_data, quotes_data) -> bool:
        """Save an author profile to database"""
        session = get_session()
        try:
            # Check if author already exists
            existing_author = get_author_by_name(session, author_name)
            if existing_author:
                logger.info(f"Author {author_name} already exists in database")
                return False
            
            # Create author
            author = Author(name=author_name)
            
            # Add bibliography data if available
            if bibliography_data:
                author.birth_year = bibliography_data.birth_year
                author.death_year = bibliography_data.death_year
                author.birth_location = bibliography_data.birth_location
                author.biography = bibliography_data.bibliography
            
            # Calculate quality score
            quality_score = self.calculate_quality_score(bibliography_data, quotes_data)
            author.quality_score = quality_score
            
            # Set status
            if not bibliography_data and not quotes_data:
                author.status = ProcessingStatus.FAILED.value
            elif quality_score < self.config.quality_threshold:
                author.status = ProcessingStatus.NEEDS_REVIEW.value
            else:
                author.status = ProcessingStatus.COMPLETED.value
            
            session.add(author)
            session.flush()  # Get the author ID
            
            # Add quotes if available
            if quotes_data:
                for quote_data in quotes_data:
                    quote = Quote(
                        author_id=author.id,
                        quote_text=quote_data.quote,
                        source_link=quote_data.link
                    )
                    
                    # Add tags
                    for tag_name in quote_data.tags:
                        tag = get_tag_by_name(session, tag_name.lower())
                        if tag:
                            quote.tags.append(tag)
                    
                    session.add(quote)
            
            session.commit()
            logger.info(f"Saved {author_name} to database with {len(quotes_data) if quotes_data else 0} quotes")
            return True
            
        except Exception as e:
            session.rollback()
            logger.error(f"Error saving {author_name} to database: {str(e)}")
            return False
        finally:
            session.close()
    
    def calculate_quality_score(self, bibliography_data, quotes_data) -> float:
        """Calculate a quality score based on available data"""
        score = 0.0
        
        # Bibliography completeness (40% of score)
        if bibliography_data:
            bio_score = 0.4
            if bibliography_data.birth_year and bibliography_data.birth_year > 0:
                bio_score += 0.1
            if bibliography_data.death_year:
                bio_score += 0.05
            if bibliography_data.birth_location and len(bibliography_data.birth_location) > 5:
                bio_score += 0.1
            if bibliography_data.bibliography and len(bibliography_data.bibliography) > 200:
                bio_score += 0.15
            score += min(bio_score, 0.4)
        
        # Quote completeness (40% of score)
        if quotes_data:
            quote_score = min(len(quotes_data) * 0.05, 0.3)  # Up to 6 quotes for max score
            
            # Bonus for theme diversity
            themes_covered = set()
            for quote in quotes_data:
                themes_covered.update(quote.tags)
            theme_bonus = len(themes_covered) * 0.033  # Up to 0.1 for all three themes
            
            score += quote_score + theme_bonus
        
        # Citation quality (20% of score)
        if quotes_data:
            citations_with_links = sum(1 for quote in quotes_data if quote.link and quote.link.startswith('http'))
            citation_score = min(citations_with_links * 0.033, 0.2)
            score += citation_score
        
        return min(score, 1.0)
    
    def log_processing_event(self, author_name: str, event_type: str, message: str, details: dict = None):
        """Log a processing event"""
        log_entry = ProcessingLog(
            author_name=author_name,
            event_type=event_type,
            message=message,
            details=details
        )
        
        # Also log to file
        log_file = self.logs_dir / f"processing_{datetime.now().strftime('%Y%m%d')}.jsonl"
        try:
            with open(log_file, 'a', encoding='utf-8') as file:
                import json
                file.write(json.dumps(log_entry.dict(), default=str) + '\n')
        except Exception as e:
            logger.error(f"Error writing to log file: {str(e)}")
    
    async def process_single_author(self, author_name: str) -> bool:
        """Process a single author and save to database"""
        start_time = time.time()
        
        # Check if already processed and skip_existing is enabled
        if self.config.skip_existing and author_name in self.get_processed_authors():
            logger.info(f"Skipping {author_name} - already processed")
            self.stats["skipped"] += 1
            return True
        
        self.log_processing_event(author_name, "start", f"Starting processing for {author_name}")
        
        try:
            # Generate bibliography and quotes concurrently
            logger.info(f"Processing {author_name}...")
            
            bibliography_task = generate_bibliography(author_name, self.config.max_retries)
            quotes_task = generate_quotes(author_name, self.config.max_retries)
            
            bibliography, quotes = await asyncio.gather(
                bibliography_task,
                quotes_task,
                return_exceptions=True
            )
            
            # Handle results
            api_calls = 6  # Estimate: 3 for bibliography + 3 for quotes
            self.stats["api_calls"] += api_calls
            
            if isinstance(bibliography, Exception):
                logger.error(f"Bibliography generation failed for {author_name}: {str(bibliography)}")
                bibliography = None
            
            if isinstance(quotes, Exception):
                logger.error(f"Quote generation failed for {author_name}: {str(quotes)}")
                quotes = []
            elif quotes is None:
                quotes = []
            
            # Calculate processing metadata
            duration = time.time() - start_time
            quality_score = self.calculate_quality_score(bibliography, quotes)
            
            # Save to database
            if self.save_author_to_database(author_name, bibliography, quotes):
                if bibliography is None and not quotes:
                    logger.warning(f"Processed {author_name} with no data")
                elif quality_score < self.config.quality_threshold:
                    logger.warning(f"Processed {author_name} with low quality score: {quality_score:.2f}")
                else:
                    self.stats["processed"] += 1
                    logger.info(f"Successfully processed {author_name} (quality: {quality_score:.2f})")
            else:
                self.stats["failed"] += 1
                logger.error(f"Failed to save {author_name} to database")
            
            self.log_processing_event(
                author_name, 
                "complete", 
                f"Processing completed",
                {
                    "duration": duration,
                    "quality_score": quality_score,
                    "bibliography_success": bibliography is not None,
                    "quotes_count": len(quotes) if quotes else 0
                }
            )
            
            return True
            
        except Exception as e:
            duration = time.time() - start_time
            error_msg = f"Unexpected error processing {author_name}: {str(e)}"
            logger.error(error_msg)
            
            self.log_processing_event(author_name, "error", error_msg, {"duration": duration})
            self.stats["failed"] += 1
            
            return False
    
    async def process_batch(self, authors: List[str]) -> List[bool]:
        """Process a batch of authors"""
        logger.info(f"Processing batch of {len(authors)} authors")
        
        results = []
        for i, author in enumerate(authors):
            try:
                result = await self.process_single_author(author)
                results.append(result)
                
                # Add delay between authors (except for the last one)
                if i < len(authors) - 1 and self.config.delay_between_authors > 0:
                    await asyncio.sleep(self.config.delay_between_authors)
                    
            except Exception as e:
                logger.error(f"Error in batch processing for {author}: {str(e)}")
                self.stats["failed"] += 1
                results.append(False)
        
        return results
    
    async def process_all_authors(self) -> Dict:
        """Process all authors from the CSV file"""
        self.stats["start_time"] = datetime.now()
        logger.info("Starting batch processing of all authors")
        
        # Load authors
        authors = self.load_authors_from_csv()
        if not authors:
            logger.error("No authors to process")
            return self.stats
        
        self.stats["total_authors"] = len(authors)
        
        # Process in batches
        all_results = []
        for i in range(0, len(authors), self.config.batch_size):
            batch = authors[i:i + self.config.batch_size]
            batch_num = (i // self.config.batch_size) + 1
            total_batches = (len(authors) + self.config.batch_size - 1) // self.config.batch_size
            
            logger.info(f"Processing batch {batch_num}/{total_batches}")
            
            batch_results = await self.process_batch(batch)
            all_results.extend(batch_results)
            
            # Add delay between batches (except for the last one)
            if i + self.config.batch_size < len(authors) and self.config.delay_between_batches > 0:
                logger.info(f"Waiting {self.config.delay_between_batches} seconds before next batch...")
                await asyncio.sleep(self.config.delay_between_batches)
        
        self.stats["end_time"] = datetime.now()
        duration = (self.stats["end_time"] - self.stats["start_time"]).total_seconds()
        
        # Final statistics
        logger.info(f"Processing completed in {duration:.2f} seconds")
        logger.info(f"Total authors: {self.stats['total_authors']}")
        logger.info(f"Successfully processed: {self.stats['processed']}")
        logger.info(f"Failed: {self.stats['failed']}")
        logger.info(f"Skipped: {self.stats['skipped']}")
        logger.info(f"API calls made: {self.stats['api_calls']}")
        
        # Save summary
        summary_file = self.logs_dir / f"processing_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        try:
            with open(summary_file, 'w', encoding='utf-8') as file:
                import json
                json.dump(self.stats, file, indent=2, default=str)
        except Exception as e:
            logger.error(f"Error saving processing summary: {str(e)}")
        
        return self.stats

async def main():
    """Main function for running the author processor"""
    # Configuration
    config = BatchProcessingConfig(
        batch_size=5,  # Start with smaller batches for testing
        max_retries=3,
        delay_between_authors=2.0,  # 2 second delay between authors
        delay_between_batches=10.0,  # 10 second delay between batches
        skip_existing=True,
        quality_threshold=0.3
    )
    
    processor = AuthorProcessor(config)
    
    # Process all authors
    stats = await processor.process_all_authors()
    
    print("\n" + "="*50)
    print("PROCESSING COMPLETE")
    print("="*50)
    print(f"Total authors: {stats['total_authors']}")
    print(f"Successfully processed: {stats['processed']}")
    print(f"Failed: {stats['failed']}")
    print(f"Skipped: {stats['skipped']}")
    print(f"API calls made: {stats['api_calls']}")
    
    if stats['start_time'] and stats['end_time']:
        duration = (stats['end_time'] - stats['start_time']).total_seconds()
        print(f"Total time: {duration:.2f} seconds")
        if stats['processed'] > 0:
            print(f"Average time per author: {duration/stats['processed']:.2f} seconds")

if __name__ == '__main__':
    asyncio.run(main())
