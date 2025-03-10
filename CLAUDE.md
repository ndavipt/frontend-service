# Instagram AI Leaderboard Project Notes

## Working State Snapshot (3/10/2025)

The project has been updated to use a microservice architecture. The scraper component has been separated into its own microservice that is deployed on Render, and this application now serves as the frontend and API gateway.

### Current Configuration

- **Backend API**: Running on port 5050
- **Frontend**: React app running on port 3000
- **Scraper Microservice**: https://scraper-service-907s.onrender.com
- **Data Storage**: PostgreSQL database managed by the scraper microservice

### Key Commands

#### Web Application
```bash
# Start the backend API server
.\start_backend.bat

# Start the frontend development server
.\start_frontend.bat
```

#### Microservice Interaction
```bash
# Test scraper service connection
curl https://scraper-service-907s.onrender.com

# Get profile data directly from scraper
curl https://scraper-service-907s.onrender.com/profiles

# Trigger a manual scrape
curl -X POST https://scraper-service-907s.onrender.com/scrape-accounts
```

### Project Structure

- `app.py` - Flask backend API and gateway to scraper microservice
- `config.py` - Application configuration
- `frontend/` - React frontend application
- `data/` - Local image cache storage

### Microservice Architecture

1. **Frontend Application**:
   - React-based UI for visualizing data
   - Communicates with backend API

2. **Backend API Gateway**:
   - Proxies requests to scraper microservice
   - Handles data transformation and formatting
   - Provides API endpoints for frontend

3. **Scraper Microservice** (deployed on Render):
   - Handles Instagram data collection
   - Stores profile data in PostgreSQL database
   - Provides RESTful API for data access

### API Endpoints

1. **Local Backend Endpoints**:
   - `/api/leaderboard` - Get current profile data (formatted for leaderboard)
   - `/api/trends` - Get historical trend data
   - `/api/accounts` - Get tracked accounts list
   - `/api/submit` - Submit new accounts for tracking
   - `/api/scrape` - Trigger manual scrape operation
   - `/api/test` - Check system health and connectivity

2. **Scraper Microservice Endpoints**:
   - `/profiles` - Get all profiles data
   - `/accounts` - Get/add tracked accounts
   - `/scrape-accounts` - Trigger scraping process

### Troubleshooting Notes

1. If the API endpoints aren't working:
   - Check that the backend is running on port 5050
   - Use http://localhost:3000/api-test to test API connection
   - Check if the scraper microservice is operational

2. If frontend doesn't display data:
   - Click "Debug API" button on the leaderboard page
   - Check browser console (F12) for errors
   - Verify network connectivity to scraper microservice
   
3. If the scraper microservice is down:
   - The backend will serve sample data as a fallback
   - Check the Render dashboard for the microservice status
   - Check the logs on Render for error messages

4. If image loading fails:
   - Check network connectivity to the scraper service
   - Make sure images are being properly proxied
   - Verify the image cache directory exists and is writable

### Next Steps and Future Improvements

1. Add a historical data API to the scraper microservice
2. Implement caching to reduce API calls to the scraper service
3. Add authentication between services for enhanced security
4. Create an admin dashboard to manage the scraper service
5. Implement real-time updates using WebSockets