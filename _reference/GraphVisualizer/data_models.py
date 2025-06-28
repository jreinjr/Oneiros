from pydantic import BaseModel, Field, validator
from typing import List, Optional, Union
from datetime import datetime
from enum import Enum

class ThemeTag(str, Enum):
    """Enumeration for the three core themes"""
    TRUTH = "truth"
    LOVE = "love"
    BEAUTY = "beauty"

class ProcessingStatus(str, Enum):
    """Status of author processing"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    NEEDS_REVIEW = "needs_review"

class Bibliography(BaseModel):
    """Biographical information for an author"""
    author: str = Field(..., description="Full name of the author")
    birth_year: int = Field(..., description="Year of birth")
    death_year: Optional[int] = Field(None, description="Year of death (None if still alive)")
    birth_location: str = Field(..., description="Place of birth")
    bibliography: str = Field(..., description="Comprehensive biographical text with citations")
    
    @validator('birth_year')
    def validate_birth_year(cls, v):
        if v < -3000 or v > datetime.now().year:
            raise ValueError('Birth year must be reasonable')
        return v
    
    @validator('death_year')
    def validate_death_year(cls, v, values):
        if v is not None:
            if 'birth_year' in values and v <= values['birth_year']:
                raise ValueError('Death year must be after birth year')
            if v > datetime.now().year:
                raise ValueError('Death year cannot be in the future')
        return v

class QuoteWithCitation(BaseModel):
    """A quote with thematic tags and source citation"""
    quote: str = Field(..., description="The actual quote text")
    tags: List[ThemeTag] = Field(..., description="Thematic tags (truth, love, beauty)")
    link: str = Field(..., description="Source URL or citation")
    
    @validator('tags')
    def validate_tags(cls, v):
        if not v:
            raise ValueError('At least one tag is required')
        if len(v) > 3:
            raise ValueError('Maximum of 3 tags allowed')
        return v
    
    @validator('quote')
    def validate_quote(cls, v):
        if len(v.strip()) < 10:
            raise ValueError('Quote must be at least 10 characters long')
        return v.strip()

class QuoteList(BaseModel):
    """Collection of quotes for compilation"""
    quotes: List[QuoteWithCitation] = Field(..., description="List of quotes")

class ProcessingMetadata(BaseModel):
    """Metadata about the processing of an author"""
    processing_date: datetime = Field(default_factory=datetime.now)
    processing_duration_seconds: Optional[float] = Field(None, description="Time taken to process")
    api_calls_made: int = Field(default=0, description="Number of API calls made")
    status: ProcessingStatus = Field(default=ProcessingStatus.PENDING)
    error_message: Optional[str] = Field(None, description="Error message if processing failed")
    data_quality_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Quality score 0-1")
    needs_manual_review: bool = Field(default=False, description="Flags content for manual review")
    retry_count: int = Field(default=0, description="Number of processing retries")

class AuthorProfile(BaseModel):
    """Complete profile combining bibliography and quotes"""
    name: str = Field(..., description="Author's full name")
    slug: str = Field(..., description="URL-safe version of name for file paths")
    bibliography: Optional[Bibliography] = Field(None, description="Biographical information")
    quotes: List[QuoteWithCitation] = Field(default_factory=list, description="List of quotes")
    metadata: ProcessingMetadata = Field(default_factory=ProcessingMetadata)
    
    @validator('slug')
    def validate_slug(cls, v):
        # Ensure slug is URL-safe
        import re
        if not re.match(r'^[a-z0-9-]+$', v):
            raise ValueError('Slug must contain only lowercase letters, numbers, and hyphens')
        return v
    
    def get_theme_quotes(self, theme: ThemeTag) -> List[QuoteWithCitation]:
        """Get quotes filtered by theme"""
        return [quote for quote in self.quotes if theme in quote.tags]
    
    def get_quote_count_by_theme(self) -> dict:
        """Get count of quotes by theme"""
        counts = {theme: 0 for theme in ThemeTag}
        for quote in self.quotes:
            for tag in quote.tags:
                counts[tag] += 1
        return counts
    
    def calculate_data_quality_score(self) -> float:
        """Calculate a quality score based on available data"""
        score = 0.0
        
        # Bibliography completeness (40% of score)
        if self.bibliography:
            bio_score = 0.4
            if self.bibliography.birth_year and self.bibliography.birth_year > 0:
                bio_score += 0.1
            if self.bibliography.death_year:
                bio_score += 0.05
            if self.bibliography.birth_location and len(self.bibliography.birth_location) > 5:
                bio_score += 0.1
            if self.bibliography.bibliography and len(self.bibliography.bibliography) > 200:
                bio_score += 0.15
            score += min(bio_score, 0.4)
        
        # Quote completeness (40% of score)
        if self.quotes:
            quote_score = min(len(self.quotes) * 0.05, 0.3)  # Up to 6 quotes for max score
            
            # Bonus for theme diversity
            themes_covered = set()
            for quote in self.quotes:
                themes_covered.update(quote.tags)
            theme_bonus = len(themes_covered) * 0.033  # Up to 0.1 for all three themes
            
            score += quote_score + theme_bonus
        
        # Citation quality (20% of score)
        if self.quotes:
            citations_with_links = sum(1 for quote in self.quotes if quote.link and quote.link.startswith('http'))
            citation_score = min(citations_with_links * 0.033, 0.2)
            score += citation_score
        
        return min(score, 1.0)

class BatchProcessingConfig(BaseModel):
    """Configuration for batch processing"""
    batch_size: int = Field(default=10, ge=1, le=50, description="Number of authors to process per batch")
    max_retries: int = Field(default=3, ge=0, le=10, description="Maximum retry attempts per author")
    delay_between_authors: float = Field(default=1.0, ge=0.0, description="Delay in seconds between processing authors")
    delay_between_batches: float = Field(default=5.0, ge=0.0, description="Delay in seconds between batches")
    skip_existing: bool = Field(default=True, description="Skip authors that have already been processed")
    quality_threshold: float = Field(default=0.3, ge=0.0, le=1.0, description="Minimum quality score to accept")

class ProcessingLog(BaseModel):
    """Log entry for processing events"""
    timestamp: datetime = Field(default_factory=datetime.now)
    author_name: str = Field(..., description="Name of author being processed")
    event_type: str = Field(..., description="Type of event (start, complete, error, etc.)")
    message: str = Field(..., description="Log message")
    details: Optional[dict] = Field(None, description="Additional details as JSON")
