"""
Simplified Flask application for the Instagram AI Leaderboard
"""
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
import json
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('web_app')

# Initialize Flask app
app = Flask(__name__, static_folder='frontend/build')
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configuration
PORT = os.getenv('PORT', 5050)
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get current leaderboard data."""
    try:
        # Read the latest data file
        data_file = os.path.join(DATA_DIR, 'latest_data.json')
        if os.path.exists(data_file):
            with open(data_file, 'r') as f:
                data = json.load(f)
            
            # Sort by follower count in descending order
            sorted_data = sorted(data, key=lambda x: x['follower_count'], reverse=True)
            return jsonify(sorted_data)
        else:
            return jsonify([])
    except Exception as e:
        logger.error(f"Error retrieving leaderboard data: {str(e)}")
        return jsonify({"error": "Failed to load leaderboard data"}), 500

@app.route('/api/accounts', methods=['GET'])
def get_accounts():
    """Get list of tracked accounts."""
    accounts_file = os.path.join(os.path.dirname(__file__), 'accounts.json')
    try:
        if os.path.exists(accounts_file):
            with open(accounts_file, 'r') as f:
                accounts_data = json.load(f)
            return jsonify(accounts_data)
        else:
            return jsonify([])
    except Exception as e:
        logger.error(f"Error retrieving accounts: {str(e)}")
        return jsonify({"error": "Failed to load accounts"}), 500

@app.route('/api/trends', methods=['GET'])
def get_trends():
    """Get historical trend data."""
    # This is a simplified version that just returns the latest data
    return get_leaderboard()

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get API status."""
    return jsonify({
        "status": "running",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """Serve frontend assets."""
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    logger.info(f"Starting API server on port {PORT}")
    app.run(host='0.0.0.0', port=int(PORT), debug=True)