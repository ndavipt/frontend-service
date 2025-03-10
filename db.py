"""
Database connection module for the Instagram AI Leaderboard application.
This centralizes database access and provides fallback to file-based storage.
"""
import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL, USE_DATABASE, DEBUG

# Setup logging
logger = logging.getLogger('db')

# Create SQLAlchemy engine and session factory if DATABASE_URL is available
if USE_DATABASE:
    logger.info(f"Using database connection: {DATABASE_URL[:20]}...")
    try:
        # Configure the engine with increased pool size and timeout
        engine = create_engine(
            DATABASE_URL,
            pool_size=20,           # Increase from default 5
            max_overflow=20,        # Increase from default 10
            pool_timeout=60,        # Increase from default 30
            pool_recycle=1800,      # Recycle connections after 30 minutes
            pool_pre_ping=True,     # Check connection health before using
            echo=DEBUG              # Log SQL statements in debug mode
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base = declarative_base()
        logger.info("Database engine initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database engine: {str(e)}")
        engine = None
        SessionLocal = None
        Base = None
else:
    logger.warning("DATABASE_URL not set, using file-based storage")
    engine = None
    SessionLocal = None
    Base = None

def get_db():
    """Get a database session"""
    if SessionLocal:
        db = None
        try:
            # Create a new session
            db = SessionLocal()
            
            # Test the connection with a simple query
            result = db.execute(text('SELECT 1')).scalar()
            logger.debug(f"Database connection test returned: {result}")
            
            # Connection is working, return the session
            return db
        except Exception as e:
            logger.error(f"Database connection error: {str(e)}")
            # Log traceback for detailed debugging
            import traceback
            logger.error(traceback.format_exc())
            
            # Close the session if it was created
            if db:
                try:
                    db.close()
                except Exception as close_error:
                    logger.error(f"Error closing failed database session: {str(close_error)}")
            
            # Return None to fall back to file-based storage
            return None
    
    # No database configured
    logger.debug("Database session factory not available - using file-based storage")
    return None

def close_db_session(db):
    """Properly close a database session"""
    if db:
        try:
            db.close()
            logger.debug("Database session closed")
        except Exception as e:
            logger.error(f"Error closing database session: {str(e)}")

class DBSessionManager:
    """Context manager for database sessions"""
    def __enter__(self):
        self.db = get_db()
        return self.db
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        close_db_session(self.db)

def is_db_available():
    """Check if database connection is available"""
    return USE_DATABASE and engine is not None