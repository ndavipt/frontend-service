"""
Centralized configuration for the Instagram AI Leaderboard application.
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Server configuration
API_PORT = int(os.getenv('PORT', 5050))
FRONTEND_PORT = 3000
BASE_URL = f"http://localhost:{API_PORT}"
FRONTEND_URL = f"http://localhost:{FRONTEND_PORT}"

# Scraper microservice API URL
SCRAPER_API_URL = os.getenv('SCRAPER_API_URL', 'https://scraper-service-907s.onrender.com')

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL')
USE_DATABASE = DATABASE_URL is not None

# Directory paths
DATA_DIR = os.path.join(os.path.dirname(__file__), os.getenv('DATA_DIR', 'data'))
IMAGE_CACHE_DIR = os.path.join(os.path.dirname(__file__), os.getenv('IMAGE_CACHE_DIR', 'data/image_cache'))

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)

# API endpoints
API_PREFIX = '/api'
API_ENDPOINTS = {
    'leaderboard': f"{API_PREFIX}/leaderboard",
    'trends': f"{API_PREFIX}/trends", 
    'accounts': f"{API_PREFIX}/accounts",
    'submit': f"{API_PREFIX}/submit",
    'scrape': f"{API_PREFIX}/scrape"
}

# Image serving
IMAGE_ROUTE = '/images'

# Default placeholder image
def get_avatar_url(name='AI'):
    """Generate a UI Avatars URL for a given name"""
    avatar_service = os.getenv('AVATAR_SERVICE', 'https://ui-avatars.com/api/')
    return f"{avatar_service}?name={name}&background=E1306C&color=fff&size=150&bold=true"

# Cache settings
CACHE_MAX_AGE = int(os.getenv('CACHE_MAX_AGE', 86400))  # 24 hours in seconds

# Debug mode
DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 't')