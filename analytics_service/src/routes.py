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

SCRAPER_SERVICE_URL = os.getenv('SCRAPER_SERVICE_URL', 'https://scraper-service-907s.onrender.com')

@bp.route('/')
def index():
    """Serve the main analytics dashboard."""
    return render_template('dashboard.html')

@bp.route('/health')
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'analytics',
        'timestamp': datetime.now().isoformat()
    })