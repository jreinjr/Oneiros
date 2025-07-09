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

from pydantic import BaseModel, Field
from openai import AsyncOpenAI

from database import (
    get_session, 
    Quote, 
    Author
)

# Ensure logs directory exists
logs_dir = Path("data/logs")
logs_dir.mkdir(parents=True, exist_ok=True)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(logs_dir / 'caution_ranking.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

client = AsyncOpenAI(
  base_url='http://localhost:11434/v1',
  api_key='ollama',
)

class CautionRanking(BaseModel):
    """Structured output for caution ranking evaluation"""
    caution_ranking: int = Field(..., ge=1, le=10, description="Caution level from 1-10 based on content appropriateness")

class CautionRanker:
    """Main class for processing quotes and generating caution rankings"""
    
    def __init__(self, output_file: str = "data/caution_rankings.csv", max_retries: int = 3, delay_between_quotes: float = 1.0):
        self.output_file = Path(output_file)
        self.max_retries = max_retries
        self.delay_between_quotes = delay_between_quotes
        
        # Ensure output directory exists
        self.output_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Processing statistics
        self.stats = {
            "total_quotes": 0,
            "processed": 0,
            "failed": 0,
            "skipped": 0,
            "api_calls": 0,
            "start_time": None,
            "end_time": None
        }
        
        # Track processed quote IDs to enable resume functionality
        self.processed_quote_ids = set()
        self._load_existing_rankings()
    
    def _load_existing_rankings(self):
        """Load existing rankings from CSV to enable resume functionality"""
        if self.output_file.exists():
            try:
                with open(self.output_file, 'r', encoding='utf-8') as file:
                    reader = csv.DictReader(file)
                    for row in reader:
                        self.processed_quote_ids.add(int(row['id']))
                logger.info(f"Loaded {len(self.processed_quote_ids)} existing rankings from {self.output_file}")
            except Exception as e:
                logger.warning(f"Error loading existing rankings: {str(e)}")
    
    def get_all_quotes(self) -> List[tuple]:
        """Get all quotes from database with author information"""
        session = get_session()
        try:
            quotes = session.query(Quote, Author.name).join(Author).all()
            logger.info(f"Retrieved {len(quotes)} quotes from database")
            return quotes
        finally:
            session.close()
    
    async def evaluate_quote_caution(self, quote_text: str, author_name: str) -> Optional[int]:
        """
        Evaluate a single quote for caution ranking using OpenAI API
        
        Args:
            quote_text: The quote text to evaluate
            author_name: Name of the author (for context)
            
        Returns:
            Caution ranking (1-10) or None if evaluation failed
        """
        for attempt in range(self.max_retries):
            try:
                logger.debug(f"Evaluating quote from {author_name} (attempt {attempt + 1})")
                
                response = await client.chat.completions.parse(
                    model="gemma3:27b-it-q8_0",
                    messages=[{"role":"user", "content": f"""
Evaluate the following quote for its "caution ranking" on a scale of 1-10, where the ranking represents "how worried should I be about putting this text string on a screen in front of a crowd of modern progressives".

Author: {author_name}
Quote: "{quote_text}"

Caution ranking should be HIGH (7-10) if the quote:
- Contains outdated ideas about race, gender roles, or sexual identity
- Contains typos, non-text data (e.g., base64 strings, URLs), or formatting artifacts
- Is especially salacious, provocative, or controversial
- Is NOT relevant to the themes of truth, love, and/or beauty

Caution ranking should be LOW (1-3) if the quote:
- Is well-formatted and contains no problematic content
- Is clearly relevant to truth, love, and/or beauty
- Would be appropriate for a general audience
- Contains timeless wisdom or insights

Caution ranking should be MEDIUM (4-6) if the quote:
- Has minor formatting issues or slight irrelevance
- Contains language that might be mildly outdated but not offensive
- Is somewhat tangential to the core themes

Provide only the numerical ranking from 1-10.
                    """}],
                    response_format=CautionRanking,
                )
                
                ranking = response.choices[0].message.parsed.caution_ranking
                self.stats["api_calls"] += 1
                
                logger.debug(f"Quote from {author_name} received ranking: {ranking}")
                return ranking
                
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1} failed for quote from {author_name}: {str(e)}")
                if attempt < self.max_retries - 1:
                    # Exponential backoff
                    wait_time = 2 ** attempt
                    logger.info(f"Waiting {wait_time} seconds before retry...")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"All attempts failed for quote from {author_name}")
                    return None
    
    def write_csv_header(self):
        """Write CSV header if file doesn't exist"""
        if not self.output_file.exists():
            with open(self.output_file, 'w', newline='', encoding='utf-8') as file:
                writer = csv.writer(file)
                writer.writerow(['id', 'author', 'quote', 'caution_ranking'])
            logger.info(f"Created new CSV file with headers: {self.output_file}")
    
    def append_ranking_to_csv(self, quote_id: int, author_name: str, quote_text: str, caution_ranking: int):
        """Append a single ranking result to the CSV file"""
        try:
            with open(self.output_file, 'a', newline='', encoding='utf-8') as file:
                writer = csv.writer(file)
                writer.writerow([quote_id, author_name, quote_text, caution_ranking])
            logger.debug(f"Appended ranking for quote {quote_id} to CSV")
        except Exception as e:
            logger.error(f"Error writing to CSV: {str(e)}")
    
    async def process_single_quote(self, quote: Quote, author_name: str) -> bool:
        """
        Process a single quote and append result to CSV
        
        Args:
            quote: Quote object from database
            author_name: Name of the author
            
        Returns:
            True if successful, False if failed
        """
        # Skip if already processed
        if quote.id in self.processed_quote_ids:
            logger.debug(f"Skipping quote {quote.id} - already processed")
            self.stats["skipped"] += 1
            return True
        
        start_time = time.time()
        
        try:
            logger.info(f"Processing quote {quote.id} from {author_name}")
            
            # Evaluate caution ranking
            caution_ranking = await self.evaluate_quote_caution(quote.quote_text, author_name)
            
            if caution_ranking is not None:
                # Append to CSV
                self.append_ranking_to_csv(quote.id, author_name, quote.quote_text, caution_ranking)
                
                # Track as processed
                self.processed_quote_ids.add(quote.id)
                self.stats["processed"] += 1
                
                duration = time.time() - start_time
                logger.info(f"Successfully processed quote {quote.id} (ranking: {caution_ranking}) in {duration:.2f}s")
                return True
            else:
                self.stats["failed"] += 1
                logger.error(f"Failed to get caution ranking for quote {quote.id}")
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            error_msg = f"Unexpected error processing quote {quote.id}: {str(e)}"
            logger.error(error_msg)
            self.stats["failed"] += 1
            return False
    
    async def process_all_quotes(self) -> Dict:
        """Process all quotes from the database"""
        self.stats["start_time"] = datetime.now()
        logger.info("Starting caution ranking processing for all quotes")
        
        # Get all quotes
        quotes_with_authors = self.get_all_quotes()
        if not quotes_with_authors:
            logger.error("No quotes found in database")
            return self.stats
        
        self.stats["total_quotes"] = len(quotes_with_authors)
        
        # Prepare CSV file
        self.write_csv_header()
        
        # Process quotes one by one
        for i, (quote, author_name) in enumerate(quotes_with_authors):
            try:
                await self.process_single_quote(quote, author_name)
                
                # Add delay between quotes (except for the last one)
                if i < len(quotes_with_authors) - 1 and self.delay_between_quotes > 0:
                    await asyncio.sleep(self.delay_between_quotes)
                
                # Log progress every 10 quotes
                if (i + 1) % 10 == 0:
                    progress = (i + 1) / len(quotes_with_authors) * 100
                    logger.info(f"Progress: {i + 1}/{len(quotes_with_authors)} ({progress:.1f}%)")
                    
            except Exception as e:
                logger.error(f"Error processing quote {quote.id}: {str(e)}")
                self.stats["failed"] += 1
        
        self.stats["end_time"] = datetime.now()
        duration = (self.stats["end_time"] - self.stats["start_time"]).total_seconds()
        
        # Final statistics
        logger.info(f"Processing completed in {duration:.2f} seconds")
        logger.info(f"Total quotes: {self.stats['total_quotes']}")
        logger.info(f"Successfully processed: {self.stats['processed']}")
        logger.info(f"Failed: {self.stats['failed']}")
        logger.info(f"Skipped (already processed): {self.stats['skipped']}")
        logger.info(f"API calls made: {self.stats['api_calls']}")
        logger.info(f"Output saved to: {self.output_file}")
        
        return self.stats

async def main():
    """Main function for running the caution ranker"""
    # Configuration
    ranker = CautionRanker(
        output_file="data/caution_rankings.csv",
        max_retries=3,
        delay_between_quotes=1.0  # 1 second delay between quotes
    )
    
    # Process all quotes
    stats = await ranker.process_all_quotes()
    
    print("\n" + "="*50)
    print("CAUTION RANKING COMPLETE")
    print("="*50)
    print(f"Total quotes: {stats['total_quotes']}")
    print(f"Successfully processed: {stats['processed']}")
    print(f"Failed: {stats['failed']}")
    print(f"Skipped (already processed): {stats['skipped']}")
    print(f"API calls made: {stats['api_calls']}")
    
    if stats['start_time'] and stats['end_time']:
        duration = (stats['end_time'] - stats['start_time']).total_seconds()
        print(f"Total time: {duration:.2f} seconds")
        if stats['processed'] > 0:
            print(f"Average time per quote: {duration/stats['processed']:.2f} seconds")

if __name__ == '__main__':
    asyncio.run(main())
