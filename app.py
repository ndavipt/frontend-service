from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_compress import Compress
import os
import json
import requests
import pandas as pd
from datetime import datetime
import logging
import time  # For cache busting with timestamps
from config import (
    API_PORT, DATA_DIR, IMAGE_CACHE_DIR, API_ENDPOINTS, 
    CACHE_MAX_AGE, get_avatar_url, IMAGE_ROUTE, SCRAPER_API_URL
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("web_app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('web_app')

# Initialize Flask app
app = Flask(__name__, static_folder='frontend/build')
# Enable CORS for all routes with extra debugging
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
Compress(app)  # Enable compression

# Add CORS headers and debug info to all responses
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    
    # Log the request for debugging
    logger.info(f"Request: {request.method} {request.path} - Response: {response.status_code}")
    
    return response

# Serve static files from data directory
@app.route('/data/<path:filename>')
def serve_data_file(filename):
    logger.info(f"Serving static file from data directory: {filename}")
    
    # Add security check for path traversal
    if '..' in filename or filename.startswith('/'):
        logger.warning(f"Attempted path traversal: {filename}")
        return jsonify({'error': 'Invalid path'}), 400
        
    # For image files, set cache headers
    if filename.endswith(('.jpg', '.jpeg', '.png', '.gif')):
        # Check if the file exists
        file_path = os.path.join(DATA_DIR, filename)
        if os.path.exists(file_path):
            logger.info(f"Image file exists: {file_path}")
            response = send_from_directory(DATA_DIR, filename)
            response.headers['Cache-Control'] = f'public, max-age={CACHE_MAX_AGE}'
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response
        else:
            # If the file doesn't exist, check if there's a hash-only mismatch
            if '/image_cache/' in filename:
                hash_part = filename.split('/')[-1].split('.')[0]
                logger.info(f"Image file not found, checking with hash: {hash_part}")
                
                # List all image files and check for close matches
                if os.path.exists(IMAGE_CACHE_DIR):
                    files = os.listdir(IMAGE_CACHE_DIR)
                    jpg_files = [f for f in files if f.endswith('.jpg')]
                    logger.info(f"Found {len(jpg_files)} jpg files in cache")
                    
                    # Try a case-insensitive search
                    hash_matches = [f for f in jpg_files if f.lower().startswith(hash_part.lower())]
                    if hash_matches:
                        match = hash_matches[0]
                        logger.info(f"Found potential match: {match}")
                        response = send_from_directory(IMAGE_CACHE_DIR, match)
                        response.headers['Cache-Control'] = f'public, max-age={CACHE_MAX_AGE}'
                        response.headers['Access-Control-Allow-Origin'] = '*'
                        return response
            
            # If still no match, generate a placeholder
            logger.warning(f"Image file not found: {file_path}")
            return jsonify({
                'error': 'Image not found',
                'path': file_path,
                'placeholder': get_avatar_url()
            }), 404
    
    return send_from_directory(DATA_DIR, filename)

# Add a simple root route for testing
@app.route('/')
def home():
    """Root endpoint for testing"""
    return jsonify({
        "message": "Instagram AI Leaderboard API is running",
        "endpoints": list(API_ENDPOINTS.values()),
        "status": "OK",
        "scraper_api": SCRAPER_API_URL
    })

@app.route('/api/scrape', methods=['POST'])
def trigger_scrape():
    """Trigger a scrape operation on the scraper microservice"""
    try:
        logger.info(f"Triggering scrape on microservice at {SCRAPER_API_URL}/scrape-accounts")
        
        # Forward the scrape request to the microservice
        response = requests.post(
            f"{SCRAPER_API_URL}/scrape-accounts",
            headers={"Cache-Control": "no-cache"},
            timeout=15  # 15-second timeout
        )
        
        # Check if the request was successful
        if response.status_code == 200:
            result = response.json()
            success = True
            message = result.get('message', 'Scrape operation triggered successfully')
            logger.info(f"Scrape operation triggered: {message}")
            
            # Wait a moment for the scraper to process, then clear any cached data
            try:
                logger.info("Clearing cached data to ensure fresh data in next request")
                # Remove latest_data_temp.json if it exists (used for caching)
                temp_data_path = os.path.join(DATA_DIR, 'latest_data_temp.json')
                if os.path.exists(temp_data_path):
                    os.remove(temp_data_path)
                    logger.info(f"Removed temporary data cache: {temp_data_path}")
            except Exception as cache_error:
                logger.warning(f"Error clearing cache: {str(cache_error)}")
        else:
            # Handle error response
            logger.error(f"Error triggering scrape: HTTP {response.status_code}")
            error_response = response.json() if response.content else {'message': f"HTTP error {response.status_code}"}
            success = False
            message = error_response.get('message', f"Failed to trigger scrape. HTTP {response.status_code}")
        
        return jsonify({
            'success': success,
            'message': message
        })
    except Exception as e:
        logger.error(f"Error triggering scrape: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/proxy-image')
def proxy_image():
    """Proxy an image from an external URL to avoid CORS issues."""
    try:
        # Get the URL from the query parameters
        image_url = request.args.get('url')
        
        if not image_url:
            return jsonify({'error': 'No URL provided'}), 400
            
        logger.info(f"Proxying image from URL: {image_url}")
        
        # Validate the URL (only allow from trusted domains)
        allowed_domains = [
            'instagram.com', 
            'cdninstagram.com', 
            'fbcdn.net',
            'onrender.com',  # Our scraper microservice
        ]
        
        # Simple URL validation
        if not any(domain in image_url for domain in allowed_domains):
            logger.warning(f"Attempted to proxy from untrusted domain: {image_url}")
            return jsonify({'error': 'URL not from allowed domain'}), 403
        
        # Fetch the image
        response = requests.get(image_url, stream=True, timeout=5)
        
        if response.status_code == 200 and response.headers.get('Content-Type', '').startswith('image/'):
            # Create a response with the image data
            from io import BytesIO
            from flask import send_file
            
            img_data = BytesIO(response.content)
            proxy_response = send_file(
                img_data,
                mimetype=response.headers.get('Content-Type', 'image/jpeg'),
                as_attachment=False
            )
            
            # Add CORS and cache headers
            proxy_response.headers['Access-Control-Allow-Origin'] = '*'
            proxy_response.headers['Cache-Control'] = f'public, max-age={CACHE_MAX_AGE}'
            
            return proxy_response
        else:
            logger.error(f"Failed to fetch image from {image_url}: HTTP {response.status_code}")
            return jsonify({'error': f'Failed to fetch image: HTTP {response.status_code}'}), 502
            
    except Exception as e:
        logger.error(f"Error proxying image: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/test')
def test_api():
    """Simple endpoint for testing API connectivity"""
    # Check scraper microservice connection
    scraper_available = False
    scraper_status = "Not tested"
    
    try:
        # Test connection to scraper microservice
        logger.info(f"Testing connection to scraper microservice at {SCRAPER_API_URL}")
        response = requests.get(f"{SCRAPER_API_URL}", timeout=5)
        
        if response.status_code == 200:
            scraper_available = True
            scraper_data = response.json()
            scraper_status = scraper_data.get('message', 'Operational')
            logger.info(f"Scraper microservice available: {scraper_status}")
        else:
            scraper_status = f"HTTP error {response.status_code}"
            logger.warning(f"Scraper microservice returned status code {response.status_code}")
    except Exception as e:
        scraper_status = f"Connection error: {str(e)}"
        logger.error(f"Error connecting to scraper microservice: {str(e)}")
    
    return jsonify({
        "message": "API test successful",
        "timestamp": datetime.now().isoformat(),
        "scraper_available": scraper_available,
        "scraper_status": scraper_status,
        "scraper_url": SCRAPER_API_URL,
        "env": {
            "data_dir": DATA_DIR,
            "image_cache_dir": IMAGE_CACHE_DIR,
            "debug": DEBUG
        }
    })

@app.route('/api/test-data', methods=['GET'])
def get_test_data():
    """Generate test data with different growth patterns for testing growth logic"""
    logger.info("Serving test data for follower growth testing")
    now = datetime.now().isoformat()
    
    test_data = [
        {
            "username": "steady_growth",
            "follower_count": 10000,
            "follower_change": 500,
            "bio": "Testing steady growth pattern (+500, +5%)",
            "profile_img_url": get_avatar_url("SG"),
            "timestamp": now
        },
        {
            "username": "negative_growth",
            "follower_count": 20000,
            "follower_change": -300,
            "bio": "Testing negative growth pattern (-300, -1.5%)",
            "profile_img_url": get_avatar_url("NG"),
            "timestamp": now
        },
        {
            "username": "zero_growth",
            "follower_count": 15000,
            "follower_change": 0,
            "bio": "Testing zero growth pattern (0, 0%)",
            "profile_img_url": get_avatar_url("ZG"),
            "timestamp": now
        },
        {
            "username": "rapid_growth",
            "follower_count": 5000,
            "follower_change": 1000,
            "bio": "Testing rapid growth pattern (+1000, +20%)",
            "profile_img_url": get_avatar_url("RG"),
            "timestamp": now
        },
        {
            "username": "no_growth_data",
            "follower_count": 8000,
            # No follower_change field to test calculation from trends
            "bio": "Testing missing growth data (should calculate from trends)",
            "profile_img_url": get_avatar_url("ND"),
            "timestamp": now
        }
    ]
    
    result = {
        "leaderboard": test_data,
        "updated_at": now,
        "total_accounts": len(test_data)
    }
    
    return jsonify(result)

@app.route('/api/test-trends', methods=['GET'])
def get_test_trends():
    """Generate test trend data with different growth patterns for testing growth logic"""
    logger.info("Serving test trend data for follower growth testing")
    now = datetime.now()
    
    # Create timestamps for the last 18 hours in 6-hour intervals
    timestamps = [
        (now - pd.Timedelta(hours=18)).isoformat(),
        (now - pd.Timedelta(hours=12)).isoformat(),
        (now - pd.Timedelta(hours=6)).isoformat(),
        now.isoformat()
    ]
    
    # Create hourly timestamps for the last 12 hours (for testing 12-hour growth)
    hourly_timestamps = [(now - pd.Timedelta(hours=h)).isoformat() for h in range(12, -1, -1)]
    hourly_steady_growth = [9000 + (h * 83) for h in range(13)]  # ~1000 over 12 hours
    hourly_negative_growth = [20600 - (h * 50) for h in range(13)]  # -600 over 12 hours
    
    trend_data = {
        "trends": [
            {
                "username": "steady_growth",
                "follower_counts": [9000, 9500, 9750, 10000],
                "timestamps": timestamps,
                "profile_img_url": get_avatar_url("SG"),
                # Add hourly data for 12-hour growth test
                "hourly_timestamps": hourly_timestamps,
                "hourly_follower_counts": hourly_steady_growth
            },
            {
                "username": "negative_growth",
                "follower_counts": [20600, 20400, 20200, 20000],
                "timestamps": timestamps,
                "profile_img_url": get_avatar_url("NG"),
                # Add hourly data for 12-hour growth test
                "hourly_timestamps": hourly_timestamps,
                "hourly_follower_counts": hourly_negative_growth
            },
            {
                "username": "zero_growth",
                "follower_counts": [15000, 15000, 15000, 15000],
                "timestamps": timestamps,
                "profile_img_url": get_avatar_url("ZG"),
                # Add hourly data for 12-hour growth test
                "hourly_timestamps": [t for t in hourly_timestamps],
                "hourly_follower_counts": [15000 for _ in range(13)]
            },
            {
                "username": "rapid_growth",
                "follower_counts": [3000, 3600, 4300, 5000],
                "timestamps": timestamps,
                "profile_img_url": get_avatar_url("RG"),
                # Add hourly data for 12-hour growth test
                "hourly_timestamps": hourly_timestamps,
                "hourly_follower_counts": [3000 + (h * 166) for h in range(13)]  # ~2000 over 12 hours
            },
            {
                "username": "no_growth_data",
                "follower_counts": [7500, 7700, 7850, 8000],
                "timestamps": timestamps,
                "profile_img_url": get_avatar_url("ND"),
                # Add hourly data for 12-hour growth test
                "hourly_timestamps": hourly_timestamps,
                "hourly_follower_counts": [7500 + (h * 42) for h in range(13)]  # ~500 over 12 hours
            }
        ],
        "dates": timestamps
    }
    
    return jsonify(trend_data)

# Define functions to interact with scraper microservice

def get_profiles_from_scraper():
    """Get profile data from the scraper microservice, supplement with local accounts if needed"""
    try:
        logger.info(f"Fetching profile data from scraper microservice at {SCRAPER_API_URL}/profiles")
        # Add cache busting parameter and set a short timeout to ensure we get fresh data
        response = requests.get(
            f"{SCRAPER_API_URL}/profiles", 
            params={"_": int(time.time())},  # Add timestamp to prevent caching
            timeout=10,  # 10-second timeout
            headers={"Cache-Control": "no-cache"}  # Request fresh data
        )
        response.raise_for_status()  # Raise exception for 4XX/5XX responses
        
        profiles_data = response.json()
        if 'profiles' in profiles_data and profiles_data['profiles']:
            profiles = profiles_data['profiles']
            logger.info(f"Successfully fetched {len(profiles)} profiles from scraper microservice")
            
            # Get local accounts to determine what profiles should be included
            from account_manager import AccountManager
            account_manager = AccountManager()
            local_accounts = account_manager.get_accounts()
            
            # Get usernames from local accounts.json
            local_usernames = {account['username'].lower() for account in local_accounts}
            logger.info(f"Found {len(local_usernames)} tracked accounts in local accounts.json")
            
            # Filter profiles to only include ones that match local accounts
            # This ensures deleted accounts don't appear in the leaderboard
            filtered_profiles = []
            for profile in profiles:
                username = profile.get('username', '').lower()
                if username in local_usernames:
                    # Keep only profiles that exist in our local accounts.json
                    filtered_profiles.append(profile)
                else:
                    logger.info(f"Skipping profile '{username}' not found in local accounts")
            
            logger.info(f"Filtered profiles from {len(profiles)} to {len(filtered_profiles)} based on local accounts")
            profiles = filtered_profiles
            
            # Load previous profile data to calculate follower changes
            previous_data = load_previous_profile_data()
            logger.info(f"Loaded previous profile data with {len(previous_data)} profiles")
            
            # Process each profile to make it compatible with our app
            for profile in profiles:
                # Add timestamp if not present
                if 'checked_at' in profile and not 'timestamp' in profile:
                    profile['timestamp'] = profile['checked_at']
                elif not 'timestamp' in profile:
                    profile['timestamp'] = datetime.now().isoformat()
                
                # Handle profile image URL
                if 'profile_pic_url' in profile and not 'profile_img_url' in profile:
                    pic_url = profile['profile_pic_url']
                    
                    # If it's a direct URL, keep it as is
                    if pic_url and pic_url.startswith('http'):
                        profile['profile_img_url'] = pic_url
                    # If it's not a URL, assume it's a hash or ID from the scraper DB
                    elif pic_url:
                        # Format it as a hash that our frontend can understand
                        profile['profile_img_url'] = f"db:{pic_url.replace('.jpg', '')}"
                    else:
                        # Generate a placeholder with username
                        profile['profile_img_url'] = get_avatar_url(profile.get('username', 'AI'))
                    
                    logger.info(f"Processed profile image for {profile.get('username')}: {profile.get('profile_img_url')}")
                
                # Ensure follower count is an integer
                if 'follower_count' in profile and profile['follower_count'] is not None:
                    try:
                        profile['follower_count'] = int(profile['follower_count'])
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid follower count for {profile.get('username')}: {profile.get('follower_count')}")
                        profile['follower_count'] = 0
                
                # Calculate follower change by comparing with previous data
                username = profile.get('username')
                
                # Log all follower counts for debugging
                logger.info(f"DEBUG: Profile '{username}' current follower_count = {profile.get('follower_count')}")
                
                # Check for data in latest_data.json, which has more accurate historical data
                try:
                    latest_data_path = os.path.join(DATA_DIR, 'latest_data.json')
                    if os.path.exists(latest_data_path):
                        with open(latest_data_path, 'r') as f:
                            historical_data = json.load(f)
                            
                        # Find the matching profile in historical data
                        historical_profile = next((p for p in historical_data if p.get('username') == username), None)
                        
                        if historical_profile and 'follower_count' in historical_profile:
                            # This is the most accurate historical data
                            historical_count = int(historical_profile.get('follower_count', 0))
                            current_count = profile.get('follower_count', 0)
                            
                            # Calculate the change
                            change = current_count - historical_count
                            profile['follower_change'] = change
                            logger.info(f"HISTORY SUCCESS: Calculated follower change from latest_data.json for {username}: {change} (from {historical_count} to {current_count})")
                            continue  # Skip further processing for this profile
                except Exception as e:
                    logger.warning(f"Error using latest_data.json for {username}: {str(e)}")
                    
                # If we get here, try using the previous_profile_cache data
                if username and username in previous_data:
                    logger.info(f"DEBUG: Found previous data for {username}: {previous_data[username]}")
                    
                    if 'follower_count' in profile and profile['follower_count'] is not None:
                        current_count = profile['follower_count']
                        previous_count = previous_data[username].get('follower_count')
                        
                        logger.info(f"DEBUG: Comparing {username}: current={current_count}, previous={previous_count}")
                        
                        # Only calculate change if we have valid numbers
                        if current_count is not None and previous_count is not None:
                            change = current_count - previous_count
                            profile['follower_change'] = change
                            logger.info(f"DEBUG SUCCESS: Calculated follower change for {username}: {change} (from {previous_count} to {current_count})")
                        else:
                            # If we can't calculate, set change to 0
                            profile['follower_change'] = 0
                            logger.info(f"DEBUG ERROR: Missing counts for {username}, setting follower_change to 0")
                    else:
                        # No follower count, can't calculate change
                        profile['follower_change'] = 0
                        logger.info(f"DEBUG ERROR: No follower_count in profile for {username}, setting follower_change to 0")
                else:
                    # New account or no previous data, can't calculate change
                    profile['follower_change'] = 0
                    if username not in previous_data:
                        logger.info(f"DEBUG ERROR: No previous data entry for {username}, setting follower_change to 0")
                
                # Handle biography/bio field
                if 'biography' in profile and not 'bio' in profile:
                    profile['bio'] = profile['biography']
                elif not 'bio' in profile and not 'biography' in profile:
                    profile['bio'] = 'No bio available'
                    
                logger.info(f"Profile {profile.get('username')} bio: {profile.get('bio', 'None')[:30]}...")
            
            # Add synthetic profiles for local accounts not in scraper data
            existing_usernames = {profile['username'].lower() for profile in profiles}
            
            for account in local_accounts:
                username = account.get('username')
                if username and username.lower() not in existing_usernames:
                    # Add a synthetic profile for this account with default values
                    logger.info(f"Adding synthetic profile for {username} not found in scraper data")
                    
                    synthetic_profile = {
                        'username': username,
                        'follower_count': 1000,    # Default value
                        'follower_change': 0,      # No change by default
                        'bio': f"AI-generated Instagram account (Tracked locally)",
                        'profile_img_url': get_avatar_url(username[:2].upper()),
                        'timestamp': datetime.now().isoformat(),
                        'synthetic': True        # Mark as synthetic
                    }
                    profiles.append(synthetic_profile)
                    existing_usernames.add(username.lower())
            
            logger.info(f"Added {len(profiles) - len(filtered_profiles)} synthetic profiles from local accounts")
            logger.info(f"Final profiles count: {len(profiles)}")
            
            # Save current profile data for future change calculations
            save_current_profile_data(profiles)
            
            return profiles
        else:
            logger.warning("No profiles returned from scraper microservice")
            raise Exception("No profiles returned")
            
    except Exception as e:
        logger.error(f"Error fetching profile data from scraper microservice: {str(e)}")
        return get_sample_data()

def load_previous_profile_data():
    """Load the previously cached profile data to calculate follower changes"""
    cache_file = os.path.join(DATA_DIR, 'previous_profiles_cache.json')
    
    if not os.path.exists(cache_file):
        logger.info(f"No previous profile cache file found at {cache_file}")
        return {}
    
    try:
        with open(cache_file, 'r') as f:
            cache_data = json.load(f)
            
        # Convert to a username-indexed dictionary for easier lookup
        profile_dict = {}
        for profile in cache_data:
            username = profile.get('username')
            if username:
                profile_dict[username] = profile
                
        logger.info(f"Loaded {len(profile_dict)} profiles from previous cache")
        return profile_dict
        
    except Exception as e:
        logger.error(f"Error loading previous profile data: {str(e)}")
        return {}

def save_current_profile_data(profiles):
    """Save the current profile data for future follower change calculations"""
    cache_file = os.path.join(DATA_DIR, 'previous_profiles_cache.json')
    
    try:
        # First, make a backup of the existing cache file if it exists
        if os.path.exists(cache_file):
            # Get current timestamp for backup filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_file = os.path.join(DATA_DIR, f'profiles_backup_{timestamp}.json')
            
            try:
                # Copy the current cache to a backup file
                import shutil
                shutil.copy2(cache_file, backup_file)
                logger.info(f"Created backup of previous profile data at {backup_file}")
                
                # Clean up old backups (keep only the last 5)
                backups = sorted([f for f in os.listdir(DATA_DIR) if f.startswith('profiles_backup_')])
                if len(backups) > 5:
                    for old_backup in backups[:-5]:
                        try:
                            os.remove(os.path.join(DATA_DIR, old_backup))
                            logger.info(f"Removed old backup file: {old_backup}")
                        except Exception as backup_error:
                            logger.warning(f"Could not remove old backup {old_backup}: {str(backup_error)}")
            except Exception as backup_error:
                logger.warning(f"Could not create backup: {str(backup_error)}")
        
        # Store only the fields we need for change calculation
        simplified_profiles = []
        for profile in profiles:
            if profile.get('follower_count') is not None:
                simplified_profiles.append({
                    'username': profile.get('username'),
                    'follower_count': profile.get('follower_count'),
                    'timestamp': profile.get('timestamp')
                })
            
        with open(cache_file, 'w') as f:
            json.dump(simplified_profiles, f, indent=2)
            
        logger.info(f"Saved {len(simplified_profiles)} profiles to cache for future change calculation")
        return True
        
    except Exception as e:
        logger.error(f"Error saving current profile data: {str(e)}")
        return False

def get_accounts_from_scraper():
    """Get account list from the scraper microservice"""
    try:
        logger.info(f"Fetching accounts from scraper microservice at {SCRAPER_API_URL}/accounts")
        response = requests.get(f"{SCRAPER_API_URL}/accounts")
        response.raise_for_status()
        
        accounts_data = response.json()
        if 'accounts' in accounts_data and accounts_data['accounts']:
            accounts = accounts_data['accounts']
            logger.info(f"Successfully fetched {len(accounts)} accounts from scraper microservice")
            return accounts
        else:
            logger.warning("No accounts returned from scraper microservice")
            raise Exception("No accounts returned")
            
    except Exception as e:
        logger.error(f"Error fetching accounts from scraper microservice: {str(e)}")
        return get_sample_accounts()
        
def get_sample_data():
    """Return sample profile data for fallback"""
    logger.info("Using sample profile data")
    return [
        {
            "username": "alexisivyedge",
            "follower_count": 314000,
            "bio": "AI-generated model | Digital Creator",
            "profile_img_url": "https://via.placeholder.com/150?text=alexisivyedge",
            "timestamp": datetime.now().isoformat()
        },
        {
            "username": "jodyvollmodel",
            "follower_count": 102000,
            "bio": "Digital fashion | AI persona",
            "profile_img_url": "https://via.placeholder.com/150?text=jodyvollmodel",
            "timestamp": datetime.now().isoformat()
        },
        {
            "username": "aikakittie",
            "follower_count": 113000,
            "bio": "AI beauty | Digital influencer",
            "profile_img_url": "https://via.placeholder.com/150?text=aikakittie",
            "timestamp": datetime.now().isoformat()
        }
    ]

def get_sample_accounts():
    """Return sample accounts for fallback"""
    return [
        {"username": "alexisivyedge", "status": "active"},
        {"username": "jodyvollmodel", "status": "active"},
        {"username": "aikakittie", "status": "active"}
    ]

def get_historical_data_from_scraper():
    """Get historical data from scraper microservice or generate using current data"""
    try:
        # First get current profile data
        profiles = get_profiles_from_scraper()
        
        # For now, we'll generate trend data from current data
        # In a future enhancement, the scraper microservice should provide historical data directly
        historical_data = {}
        today = datetime.now()
        
        # Create synthetic trend data for demo purposes
        for i in range(7):  # 7 days of data
            date_obj = today - pd.Timedelta(days=i)
            date_str = date_obj.strftime('%Y-%m-%d')
            
            # Generate daily data with slight variations
            daily_profiles = []
            for profile in profiles:
                # Make a copy to avoid modifying the original
                daily_profile = profile.copy()
                
                # Adjust follower count to simulate growth/change over time
                # Newer dates have higher follower counts (assuming growth)
                original_count = daily_profile.get('follower_count', 0)
                daily_profile['follower_count'] = int(original_count * (1 - (i * 0.005)))
                
                # Update timestamp to match this historical date
                daily_profile['timestamp'] = date_obj.isoformat()
                
                daily_profiles.append(daily_profile)
            
            historical_data[date_str] = daily_profiles
        
        logger.info(f"Generated historical data for {len(historical_data)} days")
        return historical_data
        
    except Exception as e:
        logger.error(f"Error generating historical data: {str(e)}")
        
        # Return sample data on error
        today = datetime.now()
        sample_data = {
            today.strftime('%Y-%m-%d'): get_sample_data()
        }
        
        logger.info("Returning sample historical data due to error")
        return sample_data

@app.route(API_ENDPOINTS['leaderboard'], methods=['GET'])
def get_leaderboard():
    """Get the leaderboard data from the scraper microservice"""
    try:
        # Get profile data from scraper microservice
        data = get_profiles_from_scraper()
        
        # Filter out entries with no follower count
        data = [item for item in data if item.get('follower_count') is not None]
        logger.info(f"After filtering: {len(data)} profiles with follower counts")
        
        # Sort by follower count (descending)
        data = sorted(data, key=lambda x: x.get('follower_count', 0), reverse=True)
        
        # Add rank to each item and normalize profile image URLs
        for i, item in enumerate(data):
            item['rank'] = i + 1
            
            # Make sure profile_img_url is properly formatted 
            # (this should be redundant as get_profiles_from_scraper should have already done this)
            if 'profile_pic_url' in item and not 'profile_img_url' in item:
                pic_url = item['profile_pic_url']
                
                # If it's a direct URL, keep it as is
                if pic_url and pic_url.startswith('http'):
                    item['profile_img_url'] = pic_url
                # If it's not a URL, assume it's a hash or ID from the scraper DB
                elif pic_url:
                    # Format it as a hash that our frontend can understand
                    item['profile_img_url'] = f"db:{pic_url.replace('.jpg', '')}"
                else:
                    # Generate a placeholder with username
                    item['profile_img_url'] = get_avatar_url(item.get('username', 'AI'))
            
            # Make sure bio is present
            if 'biography' in item and not 'bio' in item:
                item['bio'] = item['biography']
            elif not 'bio' in item:
                item['bio'] = 'No bio available'
                
            # Log the final follower change value for debugging
            logger.info(f"Profile {item.get('username')}: follower_change = {item.get('follower_change', 0)}")
            
            # Log the image URL and bio for debugging
            logger.info(f"Profile {item.get('username')}: image URL = {item.get('profile_img_url')}")
            logger.info(f"Profile {item.get('username')}: bio = {item.get('bio', 'None')[:30]}...")
        
        # Save current data for future change calculations
        try:
            latest_data_path = os.path.join(DATA_DIR, 'latest_data.json')
            with open(latest_data_path, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"Saved {len(data)} profiles to latest_data.json for future change calculations")
        except Exception as e:
            logger.error(f"Error saving latest data: {str(e)}")
        
        result = {
            'leaderboard': data,
            'updated_at': data[0]['timestamp'] if data else None,
            'total_accounts': len(data)
        }
        
        # Debug log
        logger.info(f"Returning leaderboard with {len(data)} profiles")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error getting leaderboard: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e), 'leaderboard': []}), 500

@app.route(API_ENDPOINTS['trends'], methods=['GET'])
def get_trends():
    """Get historical trend data from the scraper microservice"""
    try:
        # Get historical data
        historical_data = get_historical_data_from_scraper()
        
        # Extract dates in chronological order
        dates = sorted(historical_data.keys())
        
        # Create a dictionary of username -> list of follower counts
        trends = {}
        
        # Process each date to collect trend data
        for date in dates:
            profiles = historical_data.get(date, [])
            
            for profile in profiles:
                username = profile.get('username')
                follower_count = profile.get('follower_count', 0)
                
                if not username in trends:
                    # Initialize with username and empty data arrays
                    trends[username] = {
                        'username': username,
                        'follower_counts': [],
                        'timestamps': [],
                        'profile_img_url': profile.get('profile_img_url', 
                                           profile.get('profile_pic_url', get_avatar_url(username)))
                    }
                
                # Add data point
                trends[username]['follower_counts'].append(follower_count)
                trends[username]['timestamps'].append(date)
        
        # Convert dict to list for output
        trend_list = list(trends.values())
        
        result = {
            'trends': trend_list,
            'dates': dates
        }
        
        # Debug log
        logger.info(f"Returning trends with {len(trend_list)} profiles and {len(dates)} dates")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error getting trends: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e), 'trends': [], 'dates': []}), 500

@app.route(API_ENDPOINTS['accounts'], methods=['GET'])
def get_accounts():
    """Get the list of accounts being tracked from the scraper microservice"""
    try:
        # Get accounts from scraper microservice
        accounts = get_accounts_from_scraper()
        
        return jsonify({'accounts': accounts})
    except Exception as e:
        logger.error(f"Error getting accounts: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e), 'accounts': []}), 500

@app.route(API_ENDPOINTS['submit'], methods=['POST'])
def submit_account():
    """Submit a new account to the scraper microservice and local pending list"""
    try:
        data = request.json
        username = data.get('username', '').strip()
        submitter = data.get('submitter', 'Anonymous').strip()
        
        if not username:
            return jsonify({'success': False, 'message': 'Username is required'}), 400
        
        # First, add to local pending accounts
        from account_manager import AccountManager
        account_manager = AccountManager()
        
        # Add to pending list
        local_success, local_message = account_manager.submit_account(username, submitter)
        logger.info(f"Local submission result: {local_message}")
        
        # Also try to forward the account submission to the scraper microservice
        logger.info(f"Submitting new account to scraper microservice: {username}")
        try:
            response = requests.post(
                f"{SCRAPER_API_URL}/accounts",
                json={"accounts": [{"username": username, "submitter": submitter}]}
            )
            
            # Check if the request was successful
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                scraper_success = result.get('success', True)
                scraper_message = result.get('message', 'Account submitted successfully')
                logger.info(f"Scraper submission successful: {scraper_message}")
            else:
                # Handle error response
                logger.error(f"Error submitting to scraper: HTTP {response.status_code}")
                error_response = response.json() if response.content else {'message': f"HTTP error {response.status_code}"}
                scraper_success = False
                scraper_message = error_response.get('message', f"Failed to submit to scraper. HTTP {response.status_code}")
        except Exception as scraper_error:
            logger.error(f"Error connecting to scraper microservice: {str(scraper_error)}")
            scraper_success = False
            scraper_message = f"Error connecting to scraper: {str(scraper_error)}"
        
        # Use local success as the primary indicator
        if local_success:
            return jsonify({
                'success': True,
                'message': local_message,
                'scraper_result': scraper_message if scraper_success else f"Note: {scraper_message}"
            })
        else:
            return jsonify({
                'success': False,
                'message': local_message
            })
    except Exception as e:
        logger.error(f"Error submitting account: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': str(e)}), 500

# Admin endpoints
@app.route('/api/admin/pending', methods=['GET'])
def get_pending_accounts():
    """Get the list of pending accounts from the local account manager"""
    try:
        # Create an instance of the AccountManager
        from account_manager import AccountManager
        account_manager = AccountManager()
        
        # Get pending accounts
        pending_accounts = account_manager.get_pending_accounts()
        
        # Format the response
        return jsonify({
            'success': True,
            'pending': pending_accounts
        })
    except Exception as e:
        logger.error(f"Error getting pending accounts: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e), 'pending': []}), 500
        
@app.route('/api/admin/tracked', methods=['GET'])
def get_tracked_accounts():
    """Get the list of tracked accounts from the local account manager"""
    try:
        # Create an instance of the AccountManager
        from account_manager import AccountManager
        account_manager = AccountManager()
        
        # Get tracked accounts
        tracked_accounts = account_manager.get_tracked_accounts()
        
        # Format the response
        return jsonify({
            'success': True,
            'accounts': tracked_accounts
        })
    except Exception as e:
        logger.error(f"Error getting tracked accounts: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e), 'accounts': []}), 500

@app.route('/api/admin/approve', methods=['POST'])
def approve_account():
    """Approve a pending account"""
    try:
        data = request.json
        username = data.get('username')
        
        if not username:
            return jsonify({'success': False, 'message': 'Username is required'}), 400
        
        # Create an instance of the AccountManager
        from account_manager import AccountManager
        account_manager = AccountManager()
        
        # Approve the account
        success, message = account_manager.approve_account(username)
        
        # Forward the approved account to the scraper microservice if successful
        if success:
            # Add to scraper microservice
            response = requests.post(
                f"{SCRAPER_API_URL}/accounts",
                json={"accounts": [{"username": username, "submitter": "Admin"}]}
            )
            
            if response.status_code not in [200, 201]:
                logger.warning(f"Failed to add approved account to scraper: HTTP {response.status_code}")
        
        return jsonify({
            'success': success,
            'message': message
        })
    except Exception as e:
        logger.error(f"Error approving account: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/reject', methods=['POST'])
def reject_account():
    """Reject a pending account"""
    try:
        data = request.json
        username = data.get('username')
        
        if not username:
            return jsonify({'success': False, 'message': 'Username is required'}), 400
        
        # Create an instance of the AccountManager
        from account_manager import AccountManager
        account_manager = AccountManager()
        
        # Reject the account
        success, message = account_manager.reject_account(username)
        
        return jsonify({
            'success': success,
            'message': message
        })
    except Exception as e:
        logger.error(f"Error rejecting account: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/remove', methods=['POST'])
def remove_account():
    """Remove an account from tracking"""
    try:
        data = request.json
        username = data.get('username')
        
        if not username:
            return jsonify({'success': False, 'message': 'Username is required'}), 400
        
        # Create an instance of the AccountManager
        from account_manager import AccountManager
        account_manager = AccountManager()
        
        # Remove the account
        success, message = account_manager.remove_account(username)
        
        # Also try to remove from scraper microservice if possible
        try:
            response = requests.delete(
                f"{SCRAPER_API_URL}/accounts/{username}"
            )
            
            if response.status_code == 200:
                logger.info(f"Successfully removed {username} from scraper microservice")
            else:
                logger.warning(f"Failed to remove {username} from scraper microservice: HTTP {response.status_code}")
        except Exception as scraper_error:
            logger.error(f"Error removing from scraper microservice: {str(scraper_error)}")
        
        return jsonify({
            'success': success,
            'message': message
        })
    except Exception as e:
        logger.error(f"Error removing account: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': str(e)}), 500

# Serve the React frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route(f'{IMAGE_ROUTE}/<path:filename>')
def serve_image(filename):
    """Serve an image file from the database, file system, or proxy from scraper."""
    logger = logging.getLogger('image_server')
    logger.info(f"Image request for: {filename}")
    
    # Security check to prevent directory traversal
    if '..' in filename or filename.startswith('/'):
        logger.warning(f"Invalid filename detected: {filename}")
        return jsonify({'error': 'Invalid filename'}), 400
    
    # Extract hash from filename (.jpg or other extension)
    hash_value = os.path.splitext(filename)[0]
    
    # Try the filesystem first (faster)
    image_path = os.path.join(IMAGE_CACHE_DIR, filename)
    if os.path.exists(image_path):
        logger.info(f"Serving image from filesystem cache: {filename}")
        try:
            response = send_from_directory(IMAGE_CACHE_DIR, filename)
            response.headers['Cache-Control'] = f'public, max-age={CACHE_MAX_AGE}'
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Content-Type'] = 'image/jpeg'  # Force image type
            response.headers['X-Source'] = 'filesystem'
            return response
        except Exception as fs_error:
            logger.error(f"Error serving from filesystem: {str(fs_error)}")
    
    # Second, try to fetch the image from the scraper microservice
    try:
        logger.info(f"Image not in filesystem, trying to fetch from scraper microservice")
        
        # Check if this is an ID from the scraper's database
        if hash_value.isalnum() and len(hash_value) >= 10:
            # Construct URL to scraper's image endpoint
            scraper_img_url = f"{SCRAPER_API_URL}/images/{hash_value}"
            logger.info(f"Attempting to retrieve image from scraper: {scraper_img_url}")
            
            # Fetch the image from the scraper
            img_response = requests.get(scraper_img_url, stream=True, timeout=5)
            
            if img_response.status_code == 200 and img_response.headers.get('Content-Type', '').startswith('image/'):
                logger.info(f"Successfully retrieved image from scraper microservice")
                
                # Save to our local filesystem for future requests
                try:
                    # Make sure directory exists
                    os.makedirs(os.path.dirname(image_path), exist_ok=True)
                    
                    with open(image_path, 'wb') as f:
                        for chunk in img_response.iter_content(chunk_size=8192): 
                            f.write(chunk)
                    logger.info(f"Saved image from scraper to filesystem: {image_path}")
                    
                    # Now serve from filesystem
                    response = send_from_directory(IMAGE_CACHE_DIR, filename)
                    response.headers['Cache-Control'] = f'public, max-age={CACHE_MAX_AGE}'
                    response.headers['Access-Control-Allow-Origin'] = '*'
                    response.headers['Content-Type'] = img_response.headers.get('Content-Type', 'image/jpeg')
                    response.headers['X-Source'] = 'scraper'
                    return response
                    
                except Exception as save_err:
                    logger.error(f"Error saving image from scraper: {str(save_err)}")
                    # Fall through to proxy the image directly
                    from io import BytesIO
                    
                    img_data = BytesIO(img_response.content)
                    return send_file(
                        img_data, 
                        mimetype=img_response.headers.get('Content-Type', 'image/jpeg'),
                        as_attachment=False
                    )
    except Exception as scraper_error:
        logger.error(f"Error fetching image from scraper: {str(scraper_error)}")
    
    # Finally, try the local database (if we haven't switched to microservice fully)
    try:
        logger.info(f"Image not found in filesystem or from scraper, trying local database: {hash_value}")
        import psycopg2
        from io import BytesIO
        from flask import send_file
        from config import DATABASE_URL
        
        # First check if DATABASE_URL is available
        if not DATABASE_URL:
            logger.warning(f"DATABASE_URL not set for image {hash_value}")
            raise Exception("DATABASE_URL not set")
        
        # Connect directly to the database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        try:
            # Query for the image data
            logger.info(f"Querying database for image with hash: {hash_value}")
            cur.execute("SELECT image_data, content_type FROM profile_images WHERE url_hash = %s", (hash_value,))
            result = cur.fetchone()
            
            if result and result[0]:
                # Image data found
                image_data, content_type = result
                logger.info(f"Image data found in database for {hash_value}, size: {len(image_data)} bytes")
                
                # Update last accessed time
                cur.execute("UPDATE profile_images SET last_accessed = CURRENT_TIMESTAMP WHERE url_hash = %s", (hash_value,))
                conn.commit()
                
                # Create response with image data
                img_bytes = BytesIO(image_data)
                response = send_file(
                    img_bytes,
                    mimetype=content_type or 'image/jpeg',
                    as_attachment=False
                )
                
                # Add cache control headers
                response.headers['Cache-Control'] = f'public, max-age={CACHE_MAX_AGE}'
                response.headers['Access-Control-Allow-Origin'] = '*'
                response.headers['X-Source'] = 'database'
                
                # Also save to filesystem for future faster access
                try:
                    # Make sure directory exists
                    os.makedirs(os.path.dirname(image_path), exist_ok=True)
                    
                    with open(image_path, 'wb') as f:
                        f.write(image_data)
                    logger.info(f"Saved image from database to filesystem: {image_path}")
                except Exception as save_err:
                    logger.error(f"Error saving db image to filesystem: {str(save_err)}")
                
                return response
            else:
                logger.info(f"No image data found in database for hash: {hash_value}")
        except Exception as query_error:
            logger.error(f"Error querying database for image: {str(query_error)}")
            import traceback
            logger.error(traceback.format_exc())
            conn.rollback()
        finally:
            cur.close()
            conn.close()
    except Exception as setup_error:
        logger.error(f"Error connecting to database: {str(setup_error)}")
        import traceback
        logger.error(traceback.format_exc())
    
    # If we get here, the image wasn't found anywhere
    logger.warning(f"Image not found in filesystem, scraper or database: {filename}")
    
    # Return a placeholder instead of a 404 for better user experience
    name = hash_value[:2].upper() if hash_value else 'AI'
    return jsonify({
        'error': 'Image not found',
        'placeholder': get_avatar_url(name)
    }), 404

if __name__ == '__main__':
    # Open a browser window to frontend URL when running directly
    import threading
    import webbrowser
    import time
    
    # Register stats dashboard routes
    try:
        from stats_dashboard import register_stats_routes
        register_stats_routes(app)
        print("Stats dashboard registered. Visit /stats to view statistics.")
    except ImportError:
        print("Stats dashboard module not found. Dashboard will not be available.")
    
    # Use port from config
    port = API_PORT
    
    def open_browser(url, delay=2):
        """Open the browser after a delay"""
        time.sleep(delay)
        webbrowser.open(url)
    
    # Open browser to the frontend URL (react dev server)
    frontend_url = "http://localhost:3000"
    browser_thread = threading.Thread(
        target=open_browser,
        args=(frontend_url, 3)
    )
    browser_thread.daemon = True
    browser_thread.start()
    
    print("="*80)
    print("Instagram AI Leaderboard API Server")
    print("="*80)
    print(f"API server running at: http://localhost:{port}")
    print("API endpoints:")
    print(f"  http://localhost:{port}/api/leaderboard")
    print(f"  http://localhost:{port}/api/trends")
    print(f"  http://localhost:{port}/api/accounts")
    print(f"  http://localhost:{port}/stats (Dashboard)")
    print("To use the full application, start the frontend server with:")
    print("  cd frontend")
    print("  npm start")
    print("="*80)
    
    # Run the Flask app
    app.run(debug=True, host='0.0.0.0', port=port)