# Analytics Microservice for Instagram AI Leaderboard

This is the Analytics microservice for the Instagram AI Leaderboard project. It provides analytics, statistics, and trend data for the Instagram AI accounts being tracked.

## Features

- Scrape statistics dashboard
- Growth and trend analysis for accounts
- RESTful API for analytics data
- Visualization of follower growth and engagement

## API Endpoints

The analytics service provides the following API endpoints:

- `GET /api/stats/scrape` - Get scraping statistics and metrics
- `GET /api/stats/growth` - Get account growth statistics
- `GET /api/stats/trends` - Get trend analysis data
- `GET /api/stats/engagement` - Get engagement metrics for accounts

## Setup

### Prerequisites

- Python 3.8 or higher
- Flask and dependencies (see requirements.txt)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/insta-leaderboard.git
cd insta-leaderboard/analytics_service
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
```bash
# Set the scraper service URL
export SCRAPER_SERVICE_URL=https://scraper-service-907s.onrender.com
# Set the port for this service (optional, defaults to 5052)
export PORT=5052
```

### Running the Service

Start the service with:

```bash
python app.py
```

The service will be available at http://localhost:5052/

## Integration with Main Application

The analytics service is designed to be used as a separate microservice for the Instagram AI Leaderboard application. The main application should be configured to call the analytics service API endpoints to retrieve analytics data.

In the main application, update the configuration to include:

```python
ANALYTICS_SERVICE_URL = 'http://localhost:5052'
```

Then use this URL to make API calls to the analytics service.

## Docker Deployment

To containerize this service:

```bash
docker build -t insta-leaderboard-analytics .
docker run -p 5052:5052 -e SCRAPER_SERVICE_URL=https://scraper-service-907s.onrender.com insta-leaderboard-analytics
```

## License

MIT