"""
Debug script for the stats dashboard to identify 500 error
"""
from flask import Flask, jsonify, render_template_string
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
logger = logging.getLogger('debug_dashboard')

app = Flask(__name__)

@app.route('/api/stats/scrape', methods=['GET'])
def get_scrape_stats():
    """Debug version of get_scrape_stats"""
    try:
        # Minimal working response
        stats_data = {
            'scrapes': [],
            'total_scrapes': 0,
            'success_count': 0,
            'failure_count': 0,
            'avg_scrape_time': 0,
            'success_rate': 0,
            'scrapes_per_day': 0,
            'last_scrape': None,
            'scrapes_by_day': {}
        }
        
        # Try to load data from file as fallback
        stats_dir = 'stats'
        os.makedirs(stats_dir, exist_ok=True)
        stats_file = os.path.join(stats_dir, 'scrape_stats.json')
        
        if os.path.exists(stats_file):
            try:
                with open(stats_file, 'r') as f:
                    scrapes = json.load(f)
                    stats_data['scrapes'] = scrapes
                    stats_data['total_scrapes'] = len(scrapes) 
                    logger.info(f"Loaded {len(scrapes)} scrape records from file")
            except Exception as e:
                logger.error(f"Error loading stats file: {str(e)}")
        
        return jsonify(stats_data)
    except Exception as e:
        logger.error(f"Error in debug scrape stats: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/scraper/status', methods=['GET'])
def get_scraper_status():
    """Debug version of get_scraper_status"""
    try:
        return jsonify({
            'status': 'idle',
            'frequency': 360,
            'last_run': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error in debug scraper status: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/stats', methods=['GET'])
def stats_dashboard():
    """Load the dashboard HTML template"""
    try:
        with open('./stats_dashboard.py', 'r') as f:
            content = f.read()
            # Extract the HTML template from the stats_dashboard.py file
            html_template = None
            for line in content.split('\n'):
                if 'dashboard_html = """' in line:
                    start_index = content.index('dashboard_html = """') + len('dashboard_html = """')
                    end_index = content.index('"""', start_index)
                    html_template = content[start_index:end_index]
                    break
            
            if html_template:
                return render_template_string(html_template)
            else:
                return "Could not find dashboard HTML template", 500
    except Exception as e:
        logger.error(f"Error loading dashboard template: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return f"Error loading dashboard: {str(e)}", 500

if __name__ == '__main__':
    print("Starting debug dashboard on port 5051")
    print("Visit http://localhost:5051/stats to debug the dashboard")
    app.run(debug=True, host='0.0.0.0', port=5051)