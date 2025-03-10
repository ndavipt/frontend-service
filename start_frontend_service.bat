@echo off
echo ===================================================
echo Starting Instagram AI Leaderboard Frontend Service
echo ===================================================
echo.

set REACT_APP_MAIN_API=http://localhost:5050
set REACT_APP_ANALYTICS_API=http://localhost:5052
set REACT_APP_SCRAPER_API=https://scraper-service-907s.onrender.com
set REACT_APP_USE_DIRECT_ANALYTICS=false

echo Main API URL: %REACT_APP_MAIN_API%
echo Analytics API URL: %REACT_APP_ANALYTICS_API%
echo Scraper API URL: %REACT_APP_SCRAPER_API%
echo Using direct analytics: %REACT_APP_USE_DIRECT_ANALYTICS%
echo.

cd frontend_service

echo Installing dependencies...
call npm install

echo Starting frontend service...
call npm start