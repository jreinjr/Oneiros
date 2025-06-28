from dotenv import load_dotenv
load_dotenv()

from openai import AsyncOpenAI
from openai.types.responses import ResponseFunctionWebSearch
from data_models import Bibliography, ThemeTag
from typing import List, Optional
import asyncio
import logging
import time

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = AsyncOpenAI()

async def generate_report(author: str, concept: str, max_retries: int = 3) -> Optional[str]:
    """
    Generate a biographical report for an author focused on a specific concept.
    
    Args:
        author: Name of the author to research
        concept: Theme to focus on (truth, love, beauty)
        max_retries: Maximum number of retry attempts
        
    Returns:
        Generated report text or None if all retries failed
    """
    for attempt in range(max_retries):
        try:
            logger.info(f"Generating {concept} report for {author} (attempt {attempt + 1})")
            
            response = await client.responses.create(
                model="gpt-4.1",
                tools=[{
                    "type": "web_search_preview",
                    "search_context_size": "high"
                }],
                tool_choice={
                    "type": "web_search_preview"
                },
                input=f"""\
Write a bibliography about {author}. Include a biographical summary (including year & place of birth and year of death if applicable), the themes & philosophy of their work, and any aspects of their life or work relevant to the concept of {concept}.
                """,
            )
            
            report = response.output[1].content[0].text
            logger.info(f"Successfully generated {concept} report for {author}")
            return report
            
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

async def compile_reports(reports: List[str], author_name: str, max_retries: int = 3) -> Optional[Bibliography]:
    """
    Compile multiple overlapping reports into a single Bibliography object.
    
    Args:
        reports: List of report texts to compile
        author_name: Name of the author for validation
        max_retries: Maximum number of retry attempts
        
    Returns:
        Compiled Bibliography object or None if compilation failed
    """
    # Filter out None reports
    valid_reports = [report for report in reports if report is not None]
    
    if not valid_reports:
        logger.error(f"No valid reports to compile for {author_name}")
        return None
    
    if len(valid_reports) < len(reports):
        logger.warning(f"Only {len(valid_reports)}/{len(reports)} reports available for {author_name}")
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Compiling reports for {author_name} (attempt {attempt + 1})")
            
            response = await client.responses.parse(
                model="gpt-4.1-mini",
                input=f"""\
Below are {len(valid_reports)} overlapping reports about {author_name}. Compile them into a single comprehensive multi-paragraph report, making sure to preserve inline citations.
Paragraphs should be short and focused on a single concept each. Each paragraph in your compiled report MUST have at least one relevant citation.

{chr(10).join(f"Report {i+1}:{chr(10)}```{chr(10)}{report}{chr(10)}```" for i, report in enumerate(valid_reports))}
                """,
                text_format=Bibliography,
            )
            
            compiled = response.output_parsed
            
            # Validate that the author name matches
            if compiled.author.lower() != author_name.lower():
                logger.warning(f"Author name mismatch: expected '{author_name}', got '{compiled.author}'")
                compiled.author = author_name  # Use the expected name
            
            logger.info(f"Successfully compiled bibliography for {author_name}")
            return compiled
            
        except Exception as e:
            logger.warning(f"Compilation attempt {attempt + 1} failed for {author_name}: {str(e)}")
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                logger.info(f"Waiting {wait_time} seconds before retry...")
                await asyncio.sleep(wait_time)
            else:
                logger.error(f"All compilation attempts failed for {author_name}")
                return None

async def generate_bibliography(author_name: str, max_retries: int = 3) -> Optional[Bibliography]:
    """
    Generate a complete bibliography for an author by researching all three themes.
    
    Args:
        author_name: Full name of the author to research
        max_retries: Maximum number of retry attempts for each operation
        
    Returns:
        Complete Bibliography object or None if generation failed
    """
    start_time = time.time()
    logger.info(f"Starting bibliography generation for {author_name}")
    
    try:
        # Create all three reports simultaneously using asyncio.gather
        themes = [theme.value for theme in ThemeTag]
        logger.info(f"Generating reports for themes: {themes}")
        
        reports = await asyncio.gather(
            generate_report(author_name, themes[0], max_retries),  # truth
            generate_report(author_name, themes[1], max_retries),  # love
            generate_report(author_name, themes[2], max_retries),  # beauty
            return_exceptions=True
        )
        
        # Handle any exceptions from gather
        valid_reports = []
        for i, report in enumerate(reports):
            if isinstance(report, Exception):
                logger.error(f"Report generation failed for {themes[i]}: {str(report)}")
                valid_reports.append(None)
            else:
                valid_reports.append(report)
        
        # Compile the reports
        compiled = await compile_reports(valid_reports, author_name, max_retries)
        
        if compiled:
            duration = time.time() - start_time
            logger.info(f"Bibliography generation completed for {author_name} in {duration:.2f} seconds")
        else:
            logger.error(f"Bibliography generation failed for {author_name}")
        
        return compiled
        
    except Exception as e:
        duration = time.time() - start_time
        logger.error(f"Bibliography generation failed for {author_name} after {duration:.2f} seconds: {str(e)}")
        return None

# For backward compatibility and testing
async def main():
    """Test function - can be removed in production"""
    author_name = "Zitkala-Sa"
    
    bibliography = await generate_bibliography(author_name)
    
    if bibliography:
        print(f"""\
{bibliography.author}
{bibliography.birth_location}
{bibliography.birth_year}-{bibliography.death_year}

{bibliography.bibliography}
        """)
    else:
        print(f"Failed to generate bibliography for {author_name}")

if __name__ == '__main__':
    asyncio.run(main())
