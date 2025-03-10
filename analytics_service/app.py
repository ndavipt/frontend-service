# analytics_service/app.py
import os
from src import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5052))
    
    print("="*80)
    print("Instagram AI Leaderboard Analytics Service")
    print("="*80)
    print(f"Starting server on port {port}...")
    print("Visit http://localhost:{port}/ to view the analytics dashboard")
    print("="*80)
    
    app.run(debug=True, host='0.0.0.0', port=port)