# Instagram AI Leaderboard Frontend Service

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
3. **Logic Service**: Provides data from the backend database and analytics (usually accessed directly)

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ndavipt/frontend-service.git
cd frontend-service
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file for configuration:
```
REACT_APP_API_URL=http://localhost:5050
REACT_APP_ANALYTICS_URL=http://localhost:5052
REACT_APP_SCRAPER_URL=https://scraper-service-907s.onrender.com
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

## Docker Deployment

Build the Docker image:

```bash
docker build -t insta-leaderboard-frontend .
```

Run the container:

```bash
docker run -p 80:80 -e REACT_APP_API_URL=http://api.example.com insta-leaderboard-frontend
```
