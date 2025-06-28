"""Test script to verify database setup and add sample data"""

from database import init_database, get_session, create_author_with_data
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_database_setup():
    """Test database initialization and add sample data"""
    
    # Initialize database
    logger.info("Initializing database...")
    init_database()
    
    # Get a session
    session = get_session()
    
    try:
        # Create sample author data
        sample_author = {
            'name': 'John Keats',
            'birth_year': 1795,
            'death_year': 1821,
            'birth_location': 'London, England',
            'biography': 'John Keats was one of the principal poets of the English Romantic movement. Despite his short life, his work had a significant impact on later poets and writers. Known for his sensual imagery and philosophical depth, Keats explored themes of beauty, love, and mortality in works such as "Ode to a Nightingale" and "Ode on a Grecian Urn".',
            'quality_score': 0.9,
            'status': 'completed',
            'quotes': [
                {
                    'text': 'A thing of beauty is a joy forever: its loveliness increases; it will never pass into nothingness.',
                    'tags': ['beauty'],
                    'link': 'https://www.poetryfoundation.org/poems/44469/endymion'
                },
                {
                    'text': 'Beauty is truth, truth beauty,—that is all ye know on earth, and all ye need to know.',
                    'tags': ['truth', 'beauty'],
                    'link': 'https://www.poetryfoundation.org/poems/44477/ode-on-a-grecian-urn'
                },
                {
                    'text': 'I have been half in love with easeful Death.',
                    'tags': ['love', 'beauty'],
                    'link': 'https://www.poetryfoundation.org/poems/44479/ode-to-a-nightingale'
                }
            ]
        }
        
        # Create the author
        logger.info(f"Creating author: {sample_author['name']}")
        author = create_author_with_data(session, sample_author)
        
        logger.info(f"Successfully created author with ID: {author.id}")
        logger.info(f"Author has {len(author.quotes)} quotes")
        
        # Verify the data
        logger.info("\nVerifying data:")
        logger.info(f"Name: {author.name}")
        logger.info(f"Years: {author.birth_year}-{author.death_year}")
        logger.info(f"Location: {author.birth_location}")
        logger.info(f"Biography length: {len(author.biography)} characters")
        logger.info(f"Quote themes: {author.get_quote_count_by_theme()}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error testing database: {str(e)}")
        return False
    finally:
        session.close()

if __name__ == '__main__':
    success = test_database_setup()
    if success:
        logger.info("\nDatabase test completed successfully!")
        logger.info("You can now run the Flask app with: python app.py")
    else:
        logger.error("\nDatabase test failed!")
