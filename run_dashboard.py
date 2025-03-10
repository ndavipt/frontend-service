"""
Simple dashboard for Instagram AI Leaderboard stats
"""
from flask import Flask, jsonify, send_from_directory
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
logger = logging.getLogger('stats_dashboard')

# Initialize Flask app
app = Flask(__name__)

# Configuration
PORT = int(os.getenv('STATS_PORT', 5051))
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
STATS_DIR = os.path.join(os.path.dirname(__file__), 'stats')

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(STATS_DIR, exist_ok=True)

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get simple statistics about the data collected"""
    try:
        # Read the latest data file
        data_file = os.path.join(DATA_DIR, 'latest_data.json')
        stats = {
            'total_accounts': 0,
            'total_followers': 0,
            'last_update': None,
            'top_accounts': []
        }
        
        if os.path.exists(data_file):
            with open(data_file, 'r') as f:
                data = json.load(f)
            
            # Sort by follower count in descending order
            sorted_data = sorted(data, key=lambda x: x.get('follower_count', 0), reverse=True)
            
            # Calculate basic stats
            stats['total_accounts'] = len(data)
            stats['total_followers'] = sum(account.get('follower_count', 0) for account in data)
            stats['last_update'] = max((account.get('timestamp', '') for account in data), default=None)
            
            # Get top 5 accounts
            stats['top_accounts'] = [
                {
                    'username': account.get('username', 'unknown'),
                    'follower_count': account.get('follower_count', 0),
                    'rank': i + 1
                }
                for i, account in enumerate(sorted_data[:5])
            ]
        
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Error retrieving stats: {str(e)}")
        return jsonify({"error": "Failed to load stats"}), 500

@app.route('/', methods=['GET'])
def dashboard():
    """Simple dashboard page"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Instagram AI Leaderboard - Stats Dashboard</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
            body { padding: 20px; }
            .stats-card { margin-bottom: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="mb-4">Instagram AI Leaderboard - Stats Dashboard</h1>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="card stats-card">
                        <div class="card-header">
                            Overall Statistics
                        </div>
                        <div class="card-body">
                            <div id="loading">Loading statistics...</div>
                            <div id="stats-overview" style="display:none;">
                                <p><strong>Total Accounts:</strong> <span id="total-accounts">0</span></p>
                                <p><strong>Total Followers:</strong> <span id="total-followers">0</span></p>
                                <p><strong>Last Update:</strong> <span id="last-update">Never</span></p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="card stats-card">
                        <div class="card-header">
                            Top Accounts
                        </div>
                        <div class="card-body">
                            <table class="table" id="top-accounts-table">
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Username</th>
                                        <th>Followers</th>
                                    </tr>
                                </thead>
                                <tbody id="top-accounts">
                                    <!-- Will be populated with JavaScript -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-12">
                    <p>
                        <a href="http://localhost:5050/api/leaderboard" class="btn btn-primary">View API Leaderboard</a>
                        <a href="http://localhost:3000" class="btn btn-success">View Main Application</a>
                    </p>
                </div>
            </div>
        </div>
        
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                fetch('/api/stats')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(data => {
                        // Update the stats
                        document.getElementById('total-accounts').textContent = data.total_accounts;
                        document.getElementById('total-followers').textContent = data.total_followers.toLocaleString();
                        
                        if (data.last_update) {
                            document.getElementById('last-update').textContent = new Date(data.last_update).toLocaleString();
                        }
                        
                        // Show the stats section
                        document.getElementById('loading').style.display = 'none';
                        document.getElementById('stats-overview').style.display = 'block';
                        
                        // Populate top accounts
                        const topAccountsTable = document.getElementById('top-accounts');
                        
                        data.top_accounts.forEach(account => {
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td>${account.rank}</td>
                                <td>${account.username}</td>
                                <td>${account.follower_count.toLocaleString()}</td>
                            `;
                            topAccountsTable.appendChild(row);
                        });
                        
                        if (data.top_accounts.length === 0) {
                            const row = document.createElement('tr');
                            row.innerHTML = '<td colspan="3" class="text-center">No accounts found</td>';
                            topAccountsTable.appendChild(row);
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching stats:', error);
                        document.getElementById('loading').textContent = `Error loading statistics: ${error.message}`;
                    });
            });
        </script>
    </body>
    </html>
    """
    return html

if __name__ == '__main__':
    print(f"Starting Stats Dashboard on port {PORT}")
    print(f"Visit http://localhost:{PORT} to view the dashboard")
    app.run(host='0.0.0.0', port=PORT)