from dotenv import load_dotenv
load_dotenv()

from openai import AsyncOpenAI
from data_models import QuoteWithCitation, QuoteList, ThemeTag
from typing import List, Optional
import asyncio
import logging
import time
import unicodedata
import re

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = AsyncOpenAI()

def clean_unicode_text(text: str) -> str:
    """
    Clean Unicode text by replacing problematic characters with ASCII equivalents.
    
    Args:
        text: The text to clean
        
    Returns:
        Cleaned text with problematic Unicode characters replaced
    """
    # Normalize Unicode to decomposed form
    text = unicodedata.normalize('NFKD', text)
    
    # Replace common problematic characters
    replacements = {
        '\u2014': '--',  # em dash
        '\u2013': '-',   # en dash
        '\u2018': "'",   # left single quote
        '\u2019': "'",   # right single quote
        '\u201C': '"',   # left double quote
        '\u201D': '"',   # right double quote
        '\u2026': '...',  # ellipsis
        '\u00A0': ' ',   # non-breaking space
        '\u2009': ' ',   # thin space
        '\u200B': '',    # zero-width space
        '\u200C': '',    # zero-width non-joiner
        '\u200D': '',    # zero-width joiner
        '\uFEFF': '',    # zero-width no-break space
    }
    
    for unicode_char, replacement in replacements.items():
        text = text.replace(unicode_char, replacement)
    
    # Remove any remaining non-ASCII characters that might cause issues
    # This is a more aggressive approach - only use if needed
    # text = ''.join(char if ord(char) < 128 else ' ' for char in text)
    
    # Clean up any multiple spaces
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()

async def find_quotes(author: str, concept: str, max_retries: int = 3) -> Optional[str]:
    """
    Find quotes from an author relevant to a specific concept.
    
    Args:
        author: Name of the author to search for quotes
        concept: Theme to focus on (truth, love, beauty)
        max_retries: Maximum number of retry attempts
        
    Returns:
        Quote search results text or None if all retries failed
    """
    for attempt in range(max_retries):
        try:
            logger.info(f"Finding {concept} quotes for {author} (attempt {attempt + 1})")
            
            response = await client.responses.create(
                model="gpt-4.1",
                tools=[{
                    "type": "web_search_preview",
                    "search_context_size": "high"
                }],
                tool_choice={
                    "type": "web_search_preview"
                },
                input=f"""Find several direct quotations from {author} relevant to the concept of {concept}.""",
            )
            
            quotes_text = response.output[1].content[0].text
            logger.info(f"Successfully found {concept} quotes for {author}")
            return quotes_text
            
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1} failed for {author} ({concept}): {str(e)}")
            if attempt < max_retries - 1:
                # Exponential backoff
                wait_time = 2 ** attempt
                logger.info(f"Waiting {wait_time} seconds before retry...")
                await asyncio.sleep(wait_time)
            else:
                logger.error(f"All attempts failed for {author} ({concept})")
                return None

async def compile_quotes(quote_results: List[str], author_name: str, max_retries: int = 3) -> Optional[List[QuoteWithCitation]]:
    """
    Compile multiple quote search results into a single list of unique quotes.
    
    Args:
        quote_results: List of quote search result texts
        author_name: Name of the author for validation
        max_retries: Maximum number of retry attempts
        
    Returns:
        List of compiled QuoteWithCitation objects or None if compilation failed
    """
    # Filter out None results
    valid_results = [result for result in quote_results if result is not None]
    
    if not valid_results:
        logger.error(f"No valid quote results to compile for {author_name}")
        return None
    
    if len(valid_results) < len(quote_results):
        logger.warning(f"Only {len(valid_results)}/{len(quote_results)} quote results available for {author_name}")
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Compiling quotes for {author_name} (attempt {attempt + 1})")
            
            response = await client.responses.parse(
                model="gpt-4.1-mini",
                input=f"""\
Below are {len(valid_results)} overlapping lists of quotes from {author_name} about the themes of truth, beauty and love. Compile them into a single list of unique quotes, where each quote is tagged with one or more of the string literals 'truth', 'beauty', 'love', picking the most relevant tags for the given quote.

IMPORTANT INSTRUCTIONS:
1. Keep each quote as a SEPARATE, DISTINCT entry - do not merge multiple quotes together
2. For poetry, preserve the forward slashes (/) that indicate line breaks - keep them as is
3. Remove any numbering, bullets, or other artifacts from the source material
4. Ensure each quote is complete and not truncated
5. If you see quotes that appear to be merged together (e.g., two poems combined), separate them into individual quotes
6. Do NOT convert slashes to newlines - keep the original formatting with slashes intact

{chr(10).join(f"Quote List {i+1}:{chr(10)}```{chr(10)}{result}{chr(10)}```" for i, result in enumerate(valid_results))}
                """,
                text_format=QuoteList,
            )
            
            compiled = response.output_parsed
            
            # Validate and clean up the quotes
            validated_quotes = []
            for quote in compiled.quotes:
                try:
                    # Ensure tags are valid ThemeTag enums
                    valid_tags = []
                    for tag in quote.tags:
                        if isinstance(tag, str):
                            # Convert string to ThemeTag if possible
                            try:
                                theme_tag = ThemeTag(tag.lower())
                                valid_tags.append(theme_tag)
                            except ValueError:
                                logger.warning(f"Invalid tag '{tag}' for quote, skipping")
                        elif isinstance(tag, ThemeTag):
                            valid_tags.append(tag)
                    
                    if valid_tags:  # Only include quotes with valid tags
                        # Clean the quote text to handle Unicode issues
                        quote.quote = clean_unicode_text(quote.quote)
                        quote.tags = valid_tags
                        validated_quotes.append(quote)
                    else:
                        logger.warning(f"Quote has no valid tags, skipping: {quote.quote[:50]}...")
                        
                except Exception as e:
                    logger.warning(f"Error validating quote, skipping: {str(e)}")
            
            logger.info(f"Successfully compiled {len(validated_quotes)} quotes for {author_name}")
            return validated_quotes
            
        except Exception as e:
            logger.warning(f"Compilation attempt {attempt + 1} failed for {author_name}: {str(e)}")
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                logger.info(f"Waiting {wait_time} seconds before retry...")
                await asyncio.sleep(wait_time)
            else:
                logger.error(f"All compilation attempts failed for {author_name}")
                return None

async def generate_quotes(author_name: str, max_retries: int = 3) -> Optional[List[QuoteWithCitation]]:
    """
    Generate a complete list of quotes for an author across all three themes.
    
    Args:
        author_name: Full name of the author to research
        max_retries: Maximum number of retry attempts for each operation
        
    Returns:
        List of QuoteWithCitation objects or None if generation failed
    """
    start_time = time.time()
    logger.info(f"Starting quote generation for {author_name}")
    
    try:
        # Create all three quote searches simultaneously using asyncio.gather
        themes = [theme.value for theme in ThemeTag]
        logger.info(f"Searching for quotes across themes: {themes}")
        
        quote_results = await asyncio.gather(
            find_quotes(author_name, themes[0], max_retries),  # truth
            find_quotes(author_name, themes[1], max_retries),  # love
            find_quotes(author_name, themes[2], max_retries),  # beauty
            return_exceptions=True
        )
        
        # Handle any exceptions from gather
        valid_results = []
        for i, result in enumerate(quote_results):
            if isinstance(result, Exception):
                logger.error(f"Quote search failed for {themes[i]}: {str(result)}")
                valid_results.append(None)
            else:
                valid_results.append(result)
        
        # Compile the quote results
        compiled_quotes = await compile_quotes(valid_results, author_name, max_retries)
        
        if compiled_quotes:
            duration = time.time() - start_time
            logger.info(f"Quote generation completed for {author_name} in {duration:.2f} seconds - found {len(compiled_quotes)} quotes")
        else:
            logger.error(f"Quote generation failed for {author_name}")
        
        return compiled_quotes
        
    except Exception as e:
        duration = time.time() - start_time
        logger.error(f"Quote generation failed for {author_name} after {duration:.2f} seconds: {str(e)}")
        return None

def get_quotes_by_theme(quotes: List[QuoteWithCitation], theme: ThemeTag) -> List[QuoteWithCitation]:
    """
    Filter quotes by a specific theme.
    
    Args:
        quotes: List of quotes to filter
        theme: Theme to filter by
        
    Returns:
        List of quotes containing the specified theme
    """
    return [quote for quote in quotes if theme in quote.tags]

def get_quote_statistics(quotes: List[QuoteWithCitation]) -> dict:
    """
    Get statistics about a collection of quotes.
    
    Args:
        quotes: List of quotes to analyze
        
    Returns:
        Dictionary with statistics
    """
    if not quotes:
        return {"total": 0, "by_theme": {theme: 0 for theme in ThemeTag}}
    
    stats = {
        "total": len(quotes),
        "by_theme": {theme: 0 for theme in ThemeTag},
        "avg_length": sum(len(quote.quote) for quote in quotes) / len(quotes),
        "with_links": sum(1 for quote in quotes if quote.link and quote.link.startswith('http'))
    }
    
    for quote in quotes:
        for tag in quote.tags:
            stats["by_theme"][tag] += 1
    
    return stats

# For backward compatibility and testing
async def main():
    """Test function - can be removed in production"""
    author_name = "Zitkala-Sa"
    
    quotes = await generate_quotes(author_name)
    
    if quotes:
        print(f"Found {len(quotes)} quotes for {author_name}:")
        print("-" * 50)
        
        for quote in quotes:
            tags_str = ", ".join([tag.value for tag in quote.tags])
            print(f'"{quote.quote}"')
            print(f"Tags: {tags_str}")
            print(f"Source: {quote.link}")
            print("-" * 50)
        
        # Print statistics
        stats = get_quote_statistics(quotes)
        print(f"\nStatistics:")
        print(f"Total quotes: {stats['total']}")
        print(f"Average length: {stats['avg_length']:.1f} characters")
        print(f"Quotes with links: {stats['with_links']}")
        print("By theme:")
        for theme, count in stats['by_theme'].items():
            print(f"  {theme.value}: {count}")
    else:
        print(f"Failed to generate quotes for {author_name}")

if __name__ == '__main__':
    asyncio.run(main())
