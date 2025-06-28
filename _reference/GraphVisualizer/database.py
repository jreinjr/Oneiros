"""Database models and setup for BeliefGraph using SQLAlchemy"""

from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime, ForeignKey, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime
import os

# Create base class for declarative models
Base = declarative_base()

# Association table for many-to-many relationship between quotes and tags
quote_tags = Table('quote_tags', Base.metadata,
    Column('quote_id', Integer, ForeignKey('quotes.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True)
)

class Author(Base):
    """Author model"""
    __tablename__ = 'authors'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    birth_year = Column(Integer)
    death_year = Column(Integer)
    birth_location = Column(String(255))
    biography = Column(Text)
    processing_date = Column(DateTime, default=datetime.now)
    quality_score = Column(Float)
    status = Column(String(50))
    
    # Relationship to quotes
    quotes = relationship('Quote', back_populates='author', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f"<Author(name='{self.name}', birth_year={self.birth_year})>"
    
    def get_quote_count_by_theme(self):
        """Get count of quotes by theme"""
        counts = {'truth': 0, 'love': 0, 'beauty': 0}
        for quote in self.quotes:
            for tag in quote.tags:
                if tag.name in counts:
                    counts[tag.name] += 1
        return counts

class Quote(Base):
    """Quote model"""
    __tablename__ = 'quotes'
    
    id = Column(Integer, primary_key=True)
    author_id = Column(Integer, ForeignKey('authors.id'), nullable=False)
    quote_text = Column(Text, nullable=False)
    source_link = Column(String(500))
    
    # Relationships
    author = relationship('Author', back_populates='quotes')
    tags = relationship('Tag', secondary=quote_tags, back_populates='quotes')
    
    def __repr__(self):
        return f"<Quote(author_id={self.author_id}, text='{self.quote_text[:50]}...')>"

class Tag(Base):
    """Tag model for themes (truth, love, beauty)"""
    __tablename__ = 'tags'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, unique=True)
    
    # Relationship to quotes
    quotes = relationship('Quote', secondary=quote_tags, back_populates='tags')
    
    def __repr__(self):
        return f"<Tag(name='{self.name}')>"

# Database setup functions
def get_database_url():
    """Get database URL from environment or use default"""
    return os.getenv('DATABASE_URL', 'sqlite:///data/beliefgraph.db')

def init_database():
    """Initialize the database and create tables"""
    # Create engine with proper encoding
    engine = create_engine(
        get_database_url(), 
        echo=False,
        connect_args={'check_same_thread': False} if 'sqlite' in get_database_url() else {}
    )
    
    # Create all tables
    Base.metadata.create_all(engine)
    
    # Create session
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Pre-populate tags if they don't exist
    existing_tags = session.query(Tag).all()
    if not existing_tags:
        tags = [
            Tag(name='truth'),
            Tag(name='love'),
            Tag(name='beauty')
        ]
        session.add_all(tags)
        session.commit()
        print("Initialized tags: truth, love, beauty")
    
    session.close()
    return engine

def get_session():
    """Get a new database session"""
    engine = create_engine(
        get_database_url(), 
        echo=False,
        connect_args={'check_same_thread': False} if 'sqlite' in get_database_url() else {}
    )
    Session = sessionmaker(bind=engine)
    return Session()

# Utility functions for data access
def get_author_by_name(session, name):
    """Get author by name"""
    return session.query(Author).filter_by(name=name).first()

def get_all_authors(session):
    """Get all authors ordered by name"""
    return session.query(Author).order_by(Author.name).all()

def get_tag_by_name(session, name):
    """Get tag by name"""
    return session.query(Tag).filter_by(name=name).first()

def create_author_with_data(session, author_data):
    """Create an author with bibliography and quotes"""
    # Create author
    author = Author(
        name=author_data['name'],
        birth_year=author_data.get('birth_year'),
        death_year=author_data.get('death_year'),
        birth_location=author_data.get('birth_location'),
        biography=author_data.get('biography'),
        quality_score=author_data.get('quality_score'),
        status=author_data.get('status', 'completed')
    )
    session.add(author)
    session.flush()  # Get the author ID
    
    # Add quotes if provided
    if 'quotes' in author_data:
        for quote_data in author_data['quotes']:
            quote = Quote(
                author_id=author.id,
                quote_text=quote_data['text'],
                source_link=quote_data.get('link', '')
            )
            
            # Add tags
            for tag_name in quote_data.get('tags', []):
                tag = get_tag_by_name(session, tag_name.lower())
                if tag:
                    quote.tags.append(tag)
            
            session.add(quote)
    
    session.commit()
    return author

if __name__ == '__main__':
    # Initialize database when run directly
    init_database()
    print("Database initialized successfully!")
