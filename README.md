# Instagram AI Leaderboard

A web application that tracks and visualizes follower counts for AI-generated Instagram accounts. Profile images are stored in a PostgreSQL database for efficient access and caching.

![Instagram AI Leaderboard](https://via.placeholder.com/800x400?text=Instagram+AI+Leaderboard)

## Overview

The Instagram AI Leaderboard project combines web scraping and a modern web application to track the popularity of AI-generated Instagram personalities. It features:

## Features

- Scrapes follower counts from Instagram profiles using Selenium
- Stores follower count history and profile data
- Updates data periodically (every 6 hours by default)
- Displays data in a responsive web app with leaderboard and trends
- Provides tools for managing the list of accounts to track
- Handles user submissions of new accounts through a moderation system

## Project Structure

### Data Collection
- `scraper.py` - Main scraping functionality using Selenium
- `scheduler.py` - Runs periodic scraping jobs
- `account_manager.py` - Manages the list of accounts and handles submissions
- `accounts.json` - List of accounts to track
- `pending_accounts.json` - Submissions pending moderation
- `data/` - Directory containing scraped data (CSV and JSON formats)

### Web Application
- `app.py` - Flask backend serving the API and web app
- `src/` - Backend code organization
  - `routes/` - API route handlers
  - `schemas/` - Request validation models using Pydantic
  - `services/` - Business logic and services
  - `utils/` - Utility functions and helpers
- `frontend/` - React frontend application
- `run_webapp.py` - Script to run both frontend and backend

## Setup Instructions

### Using Docker (Recommended)

The easiest way to run the application is using Docker and Docker Compose:

1. Clone this repository:
```bash
git clone https://github.com/yourusername/insta-leaderboard.git
cd insta-leaderboard
```

2. Run the development script:
```bash
# On Windows
.\dev.bat

# On Linux/Mac
chmod +x dev.sh
./dev.sh
```

3. Access the application:
   - Frontend UI: http://localhost:3000
   - Backend API: http://localhost:5050
   - Stats Dashboard: http://localhost:5050/stats

### Manual Setup (Alternative)

If you prefer not to use Docker:

1. Prerequisites:
   - Python 3.8 or higher
   - Node.js and npm (for frontend development)
   - PostgreSQL database

2. Install required Python packages:
```bash
pip install -r requirements.txt
```

3. Configure database connection in .env file:
```
DATABASE_URL=postgres://username:password@host:port/database
```

4. Run the database setup script:
```bash
# On Windows
setup_database.bat

# On Mac/Linux
./setup_database.sh
```

5. Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

### Usage

#### Data Collection

**Running the scraper once:**
```bash
python scraper.py
```

**Running the scheduler (updates every 6 hours):**
```bash
python scheduler.py
```

**Managing accounts:**
```bash
# List all accounts
python account_manager.py list

# Add a new account
python account_manager.py add USERNAME

# Remove an account
python account_manager.py remove USERNAME

# List pending submissions
python account_manager.py pending

# Approve a submission
python account_manager.py approve USERNAME

# Reject a submission
python account_manager.py reject USERNAME
```

#### Web Application

**Running the web application:**

1. Start the backend server:
```bash
.\start_backend.bat
```

2. Start the frontend development server:
```bash
.\start_frontend.bat
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

**Build the frontend for production:**
```bash
cd frontend
npm run build
cd ..
```

**Run the full application with one command:**
If you prefer to use the run_webapp.py script:
```bash
python run_webapp.py
```
Note: This script may need adjustment for Windows environments.

## API Endpoints

The web app provides the following API endpoints:

- `GET /api/leaderboard` - Get the current leaderboard data
- `GET /api/trends` - Get historical trend data
- `GET /api/accounts` - Get the list of tracked accounts
- `POST /api/submit` - Submit a new account for consideration

## Data Format

The scraper collects the following data for each account:

- Username
- Follower count
- Bio text
- Profile image URL
- Timestamp of scraping

Data is saved in both CSV and JSON formats in the `data/` directory:
- `data/instagram_data_TIMESTAMP.csv` - Archive of each scraping run
- `data/instagram_data_TIMESTAMP.json` - Archive in JSON format
- `data/latest_data.json` - Most recent data (used by web app)

## Compliance Notes

This tool is designed to respect Instagram's terms of service by:
- Only collecting publicly available data
- Implementing reasonable delays between requests
- Not scraping private accounts
- Not using Instagram's API in unauthorized ways

## Troubleshooting

If you encounter issues with the application, check the following:

### Database Connection Issues
- Verify the DATABASE_URL in `.env` is correct
- Try accessing http://localhost:5050/health to check database connection status
- See the detailed error message and check if PostgreSQL is accepting connections

### API Connection Issues
- Try accessing http://localhost:5050/api/test to verify API is working
- Check if frontend can successfully connect to the backend
- Look for CORS errors in the browser console

### Docker Issues
- Make sure Docker and Docker Compose are installed and running
- Check container logs with `docker logs insta-leaderboard`
- Try restarting: `docker-compose down && docker-compose up -d`

For more detailed troubleshooting steps, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## License

MIT