# Split this section out later
from flask import Flask, jsonify, request, abort, Response, render_template, send_from_directory
import json
import os
import random
import time
import requests
import base64
import hashlib
from io import BytesIO
from datetime import datetime, timedelta
import logging
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_cors import CORS

# Import the stats dashboard routes
import stats_dashboard

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("web_app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('web_app')

# Create and configure the app
app = Flask(__name__, static_folder='frontend/build', static_url_path='')
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
CORS(app)

# Register stats routes
stats_dashboard.register_stats_routes(app)

# Configuration
SCRAPER_URL = os.environ.get('SCRAPER_URL', 'https://scraper-service-907s.onrender.com')
ANALYTICS_URL = os.environ.get('ANALYTICS_URL', 'http://localhost:5052')
CACHE_EXPIRY = 5 * 60  # 5 minutes
PROFILE_CACHE = {}

def get_profiles_from_scraper(bypass_cache=False):
    """Get profiles from the scraper microservice or cached data"""
    now = datetime.now()
    
    # Check if we have cached data that's still valid
    if not bypass_cache and 'profiles' in PROFILE_CACHE and 'timestamp' in PROFILE_CACHE:
        cache_age = (now - PROFILE_CACHE['timestamp']).total_seconds()
        if cache_age < CACHE_EXPIRY:
            logger.info(f"Using cached profile data (age: {cache_age:.1f}s)")
            return PROFILE_CACHE['profiles']
    
    # Add cache buster to avoid CDN caching
    cache_buster = int(time.time())
    profile_url = f"{SCRAPER_URL}/profiles?_={cache_buster}"
    
    try:
        logger.info(f"Fetching profiles from scraper: {profile_url}")
        response = requests.get(profile_url, timeout=10)
        
        if response.status_code == 200:
            profiles = response.json()
            logger.info(f"Retrieved {len(profiles)} profiles from scraper service")
            
            # Calculate follower changes from previous data
            processed_profiles = []
            prev_profiles = {p['username']: p for p in PROFILE_CACHE.get('profiles', [])}
            
            for profile in profiles:
                username = profile['username']
                follower_change = 0
                
                # Calculate follower change if we have previous data
                if username in prev_profiles:
                    prev_followers = prev_profiles[username].get('followers', 0)
                    current_followers = profile.get('followers', 0)
                    follower_change = current_followers - prev_followers
                
                # Calculate followers from history if available
                if not follower_change and 'history' in profile and len(profile['history']) >= 2:
                    sorted_history = sorted(profile['history'], key=lambda x: x.get('timestamp', ''))
                    if len(sorted_history) >= 2:
                        latest = sorted_history[-1].get('followers', 0)
                        previous = sorted_history[-2].get('followers', 0)
                        follower_change = latest - previous
                
                # Add follower change to profile data
                profile_with_change = profile.copy()
                profile_with_change['follower_change'] = follower_change
                processed_profiles.append(profile_with_change)
            
            # Update the cache
            PROFILE_CACHE['profiles'] = processed_profiles
            PROFILE_CACHE['timestamp'] = now
            
            # Cache the raw profiles for change calculation
            with open('data/previous_profiles_cache.json', 'w') as f:
                json.dump(profiles, f, indent=2)
            
            return processed_profiles
        else:
            logger.warning(f"Failed to get profiles from scraper: {response.status_code}")
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to scraper service: {str(e)}")
    
    # If we got here, we failed to get data from the scraper service
    # Try to load cached profiles
    if 'profiles' in PROFILE_CACHE:
        logger.info("Using cached profiles as fallback")
        return PROFILE_CACHE['profiles']
    
    # Try to load backup data from file
    try:
        with open('data/latest_data.json', 'r') as f:
            profiles = json.load(f)
            logger.info(f"Loaded {len(profiles)} profiles from backup file")
            
            # Process for follower changes
            processed_profiles = []
            
            # Try to load previous profile cache
            prev_profiles = {}
            if os.path.exists('data/previous_profiles_cache.json'):
                try:
                    with open('data/previous_profiles_cache.json', 'r') as prev_file:
                        prev_profiles = {p['username']: p for p in json.load(prev_file)}
                except:
                    logger.warning("Failed to load previous profiles cache")
            
            for profile in profiles:
                username = profile['username']
                follower_change = 0
                
                # Calculate follower change if we have previous data
                if username in prev_profiles:
                    prev_followers = prev_profiles[username].get('followers', 0)
                    current_followers = profile.get('followers', 0)
                    follower_change = current_followers - prev_followers
                
                # Add follower change to profile data
                profile_with_change = profile.copy()
                profile_with_change['follower_change'] = follower_change
                processed_profiles.append(profile_with_change)
            
            # Update the cache
            PROFILE_CACHE['profiles'] = processed_profiles
            PROFILE_CACHE['timestamp'] = now
            
            return processed_profiles
    except Exception as e:
        logger.error(f"Error loading backup data: {str(e)}")
        
    # If all else fails, return sample data
    logger.warning("Using sample data as last resort")
    return [
        {
            "username": "sample_ai_account1",
            "profile_pic_url": "/static/sample1.jpg", 
            "followers": 250000,
            "follower_change": 1500,
            "bio": "Sample AI-generated account"
        },
        {
            "username": "sample_ai_account2",
            "profile_pic_url": "/static/sample2.jpg",
            "followers": 180000,
            "follower_change": 900,
            "bio": "Another sample account"
        }
    ]

# Main routes
@app.route('/')
def serve():
    """Serve the React app"""
    return app.send_static_file('index.html')

@app.route('/favicon.ico')
def favicon():
    """Serve the favicon"""
    return app.send_static_file('favicon.ico')

@app.route('/api/test')
def test_api():
    """Test endpoint to verify API is working"""
    return jsonify({
        'status': 'ok', 
        'message': 'API is working',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/service-status')
def service_status():
    """Check connectivity to microservices"""
    scraper_status = "unknown"
    scraper_message = ""
    analytics_status = "unknown"
    analytics_message = ""
    
    # Check scraper service
    try:
        scraper_response = requests.get(f"{SCRAPER_URL}/health", timeout=5)
        if scraper_response.status_code == 200:
            scraper_status = "online"
            scraper_data = scraper_response.json()
            scraper_message = scraper_data.get('message', 'Service responding')
        else:
            scraper_status = "error"
            scraper_message = f"HTTP {scraper_response.status_code}"
    except requests.exceptions.RequestException as e:
        scraper_status = "offline"
        scraper_message = str(e)
    
    # Check analytics service
    try:
        analytics_response = requests.get(f"{ANALYTICS_URL}/health", timeout=5)
        if analytics_response.status_code == 200:
            analytics_status = "online"
            analytics_data = analytics_response.json()
            analytics_message = analytics_data.get('message', 'Service responding')
        else:
            analytics_status = "error"
            analytics_message = f"HTTP {analytics_response.status_code}"
    except requests.exceptions.RequestException as e:
        analytics_status = "offline"
        analytics_message = str(e)
    
    return jsonify({
        'timestamp': datetime.now().isoformat(),
        'gateway': {
            'status': 'online',
            'message': 'API Gateway operational'
        },
        'services': {
            'scraper': {
                'status': scraper_status,
                'message': scraper_message,
                'url': SCRAPER_URL
            },
            'analytics': {
                'status': analytics_status,
                'message': analytics_message,
                'url': ANALYTICS_URL
            }
        }
    })

@app.route('/api/leaderboard')
def get_leaderboard():
    """Get leaderboard data"""
    bypass_cache = request.args.get('refresh') == 'true'
    profiles = get_profiles_from_scraper(bypass_cache)
    
    # Sort profiles by follower count (descending)
    sorted_profiles = sorted(profiles, key=lambda x: x.get('followers', 0), reverse=True)
    
    return jsonify({
        'profiles': sorted_profiles,
        'timestamp': datetime.now().isoformat(),
        'total': len(sorted_profiles)
    })

@app.route('/api/accounts')
def get_accounts():
    """Get tracked accounts"""
    try:
        with open('accounts.json', 'r') as f:
            accounts = json.load(f)
        return jsonify(accounts)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/submit', methods=['POST'])
def submit_account():
    """Submit a new account for tracking"""
    try:
        data = request.json
        if not data or 'username' not in data:
            return jsonify({'error': 'Username is required'}), 400
            
        username = data['username'].lower().strip()
        if not username or len(username) < 3 or username.startswith('@'):
            return jsonify({'error': 'Invalid username format'}), 400
        
        # Check if we already have this account
        with open('accounts.json', 'r') as f:
            accounts = json.load(f)
            
        if username in [a.lower() for a in accounts]:
            return jsonify({'error': 'Account already being tracked'}), 400
            
        # Check pending accounts
        with open('pending_accounts.json', 'r') as f:
            pending = json.load(f)
            
        if username in [p['username'].lower() for p in pending]:
            return jsonify({'error': 'Account already pending approval'}), 400
            
        # Add to pending
        pending.append({
            'username': username,
            'submitted_at': datetime.now().isoformat(),
            'status': 'pending'
        })
        
        with open('pending_accounts.json', 'w') as f:
            json.dump(pending, f, indent=2)
            
        return jsonify({'status': 'success', 'message': 'Account submitted for approval'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/trends')
def get_trends():
    """Get follower trend data"""
    # Check if we should forward to analytics service
    use_analytics = request.args.get('analytics') == 'true'
    
    if use_analytics:
        try:
            response = requests.get(f"{ANALYTICS_URL}/api/stats/trends", timeout=10)
            if response.status_code == 200:
                return jsonify(response.json())
        except:
            logger.warning("Failed to get trends from analytics service, falling back to local processing")
    
    # If analytics service failed or wasn't requested, use local processing
    bypass_cache = request.args.get('refresh') == 'true'
    profiles = get_profiles_from_scraper(bypass_cache)
    
    trends = []
    for profile in profiles:
        if 'history' in profile and len(profile['history']) > 0:
            username = profile['username']
            history = profile['history']
            
            # Sort history by timestamp
            sorted_history = sorted(history, key=lambda x: x.get('timestamp', ''))
            
            # Create data points
            data_points = []
            for entry in sorted_history:
                data_points.append({
                    'timestamp': entry.get('timestamp'),
                    'followers': entry.get('followers', 0)
                })
            
            if data_points:
                trends.append({
                    'username': username,
                    'current_followers': profile.get('followers', 0),
                    'data_points': data_points
                })
    
    return jsonify({
        'trends': trends,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/scrape', methods=['POST'])
def trigger_scrape():
    """Trigger a new scrape operation"""
    try:
        # Clear profile cache
        PROFILE_CACHE.clear()
        
        # Call the scraper microservice
        response = requests.post(f"{SCRAPER_URL}/scrape-accounts", timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            return jsonify({
                'status': 'success',
                'message': 'Scrape operation triggered successfully',
                'scraper_response': result
            })
        else:
            return jsonify({
                'status': 'error',
                'message': f"Scraper returned error: HTTP {response.status_code}",
                'scraper_response': response.text
            }), 500
    except requests.exceptions.RequestException as e:
        return jsonify({
            'status': 'error',
            'message': f"Error connecting to scraper service: {str(e)}"
        }), 500

@app.route('/api/analytics/growth', methods=['GET'])
def get_growth_stats():
    """Get growth statistics (proxy to analytics service)"""
    try:
        # Add cache busting parameter
        cache_buster = int(time.time())
        response = requests.get(f"{ANALYTICS_URL}/growth?_={cache_buster}", timeout=10)
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({
                'status': 'error',
                'message': f"Analytics service returned error: HTTP {response.status_code}"
            }), response.status_code
    except requests.exceptions.RequestException as e:
        return jsonify({
            'status': 'error',
            'message': f"Error connecting to analytics service: {str(e)}"
        }), 502

@app.route('/api/profile/<username>')
def get_profile(username):
    """Get detailed profile data for a specific account"""
    profiles = get_profiles_from_scraper()
    
    # Find the profile by username
    profile = next((p for p in profiles if p.get('username', '').lower() == username.lower()), None)
    
    if profile:
        return jsonify(profile)
    else:
        return jsonify({'error': 'Profile not found'}), 404

# Image proxy routes
@app.route('/img/profile/<username>')
def get_profile_image(username):
    """Get the profile image for a user. Proxies from Instagram and caches locally."""
    profiles = get_profiles_from_scraper()
    
    # Find the profile picture URL
    profile = next((p for p in profiles if p.get('username', '').lower() == username.lower()), None)
    
    if not profile or 'profile_pic_url' not in profile:
        # Return a default image
        return send_from_directory('frontend/build/static', 'default-profile.jpg')
    
    # Get the URL
    pic_url = profile['profile_pic_url']
    
    # Check if it's already a local path
    if pic_url.startswith('/'):
        return send_from_directory('frontend/build', pic_url.lstrip('/'))
    
    # Hash the URL to create a filename
    url_hash = hashlib.md5(pic_url.encode()).hexdigest()
    cache_dir = 'data/image_cache'
    
    # Create cache directory if it doesn't exist
    os.makedirs(cache_dir, exist_ok=True)
    
    # Check if we have a cached version
    cache_path = os.path.join(cache_dir, f"{url_hash}.jpg")
    if os.path.exists(cache_path):
        return send_from_directory(cache_dir, f"{url_hash}.jpg")
    
    # Download the image
    try:
        response = requests.get(pic_url, timeout=10)
        if response.status_code == 200:
            # Save to cache
            with open(cache_path, 'wb') as f:
                f.write(response.content)
            
            # Return the image
            return send_from_directory(cache_dir, f"{url_hash}.jpg")
        else:
            logger.warning(f"Failed to download profile image: {response.status_code}")
    except Exception as e:
        logger.error(f"Error downloading profile image: {str(e)}")
    
    # If we got here, we failed to get the image
    return send_from_directory('frontend/build/static', 'default-profile.jpg')

# Start the app
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5050))
    
    print("="*80)
    print("Instagram AI Leaderboard")
    print("="*80)
    print(f"Starting server on port {port}...")
    print(f"Scraper URL: {SCRAPER_URL}")
    print(f"Analytics URL: {ANALYTICS_URL}")
    print("="*80)
    
    app.run(debug=True, host='0.0.0.0', port=port)