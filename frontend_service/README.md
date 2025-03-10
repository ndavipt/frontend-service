# Frontend Microservice for Instagram AI Leaderboard

This is the frontend microservice for the Instagram AI Leaderboard project. It provides a React-based user interface that connects to other microservices via API.

## Features

- Responsive UI for displaying the Instagram AI leaderboard
- API-based integration with other microservices
- Configurable endpoints for connecting to different environments
- Service health monitoring and status display

## Architecture

The frontend is designed as a standalone microservice that communicates with:

1. **Main Backend API**: Acts as an API gateway for the frontend
2. **Analytics Service**: Provides analytics and statistics data
3. **Scraper Service**: Handles Instagram data collection (usually accessed through the API gateway)

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/insta-leaderboard.git
cd insta-leaderboard/frontend_service
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file for configuration:
```
REACT_APP_MAIN_API=http://localhost:5050
REACT_APP_ANALYTICS_API=http://localhost:5052
REACT_APP_SCRAPER_API=https://scraper-service-907s.onrender.com
REACT_APP_USE_DIRECT_ANALYTICS=false
```

### Running the Service

Start the development server:

```bash
npm start
```

The frontend will be available at http://localhost:3000

### Building for Production

```bash
npm run build
```

The production build will be in the `build` directory.

## Configuration

The service can be configured using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| REACT_APP_MAIN_API | URL of the main backend API | http://localhost:5050 |
| REACT_APP_ANALYTICS_API | URL of the analytics service API | http://localhost:5052 |
| REACT_APP_SCRAPER_API | URL of the scraper service API | https://scraper-service-907s.onrender.com |
| REACT_APP_USE_DIRECT_ANALYTICS | Whether to use analytics service directly | false |
| REACT_APP_ENABLE_TEST_FEATURES | Enable experimental features | false |

## Deployment

### Docker

Build the Docker image:

```bash
docker build -t insta-leaderboard-frontend .
```

Run the container:

```bash
docker run -p 80:80 -e REACT_APP_MAIN_API=http://api.example.com insta-leaderboard-frontend
```

### Static Hosting

The build output can be deployed to any static hosting service such as:

- Netlify
- Vercel
- AWS S3 + CloudFront
- GitHub Pages

## Working with Other Microservices

The frontend service connects to other microservices through APIs defined in `src/services/api.js`. 

- All API requests go through the main API by default
- If `REACT_APP_USE_DIRECT_ANALYTICS=true`, analytics requests will go directly to the analytics service
- All API communications include cache-busting to ensure fresh data

## License

MIT