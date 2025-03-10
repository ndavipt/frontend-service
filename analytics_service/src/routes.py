# analytics_service/src/routes.py
from flask import Blueprint, render_template, jsonify
import os
import json
from datetime import datetime, timedelta
import logging
from collections import defaultdict
import requests

bp = Blueprint('routes', __name__)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("analytics_service.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('analytics_service')

# Configuration
SCRAPER_SERVICE_URL = os.getenv('SCRAPER_SERVICE_URL', 'https://scraper-service-907s.onrender.com')
logger.info(f"Routes module using scraper service URL: {SCRAPER_SERVICE_URL}")

@bp.route('/')
def index():
    """Serve the main analytics dashboard."""
    return render_template('dashboard.html')

@bp.route('/health')
def health_check():
    """Health check endpoint."""
    # Check connectivity to scraper service
    scraper_status = "unknown"
    try:
        response = requests.get(f"{SCRAPER_SERVICE_URL}/health", timeout=5)
        if response.status_code == 200:
            scraper_status = "connected"
        else:
            scraper_status = f"error: HTTP {response.status_code}"
    except requests.exceptions.RequestException as e:
        scraper_status = f"error: {str(e)}"
    
    return jsonify({
        'status': 'healthy',
        'service': 'analytics',
        'timestamp': datetime.now().isoformat(),
        'scraper_connectivity': scraper_status,
        'scraper_url': SCRAPER_SERVICE_URL
    })