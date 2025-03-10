@echo off
echo ===================================================
echo Starting Instagram AI Leaderboard Frontend Service
echo ===================================================
echo.

set REACT_APP_API_URL=http://localhost:5050
set REACT_APP_ANALYTICS_URL=http://localhost:5052
set REACT_APP_SCRAPER_URL=https://scraper-service-907s.onrender.com
set PORT=3000
set ESLINT_NO_DEV_ERRORS=true
set DISABLE_ESLINT_PLUGIN=true

echo API URL: %REACT_APP_API_URL%
echo Analytics URL: %REACT_APP_ANALYTICS_URL%
echo Scraper URL: %REACT_APP_SCRAPER_URL%
echo Port: %PORT%
echo.

cd frontend_service

echo Installing dependencies...
call npm install

echo Starting frontend service...
call npm start