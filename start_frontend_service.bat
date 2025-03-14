@echo off
echo ===================================================
echo Starting Instagram AI Leaderboard Frontend Service
echo ===================================================
echo.

set REACT_APP_MAIN_API=http://localhost:5050
set REACT_APP_ANALYTICS_API=http://localhost:5052
set REACT_APP_LOGIC_URL=https://logic-service.onrender.com
set REACT_APP_USE_DIRECT_ANALYTICS=false

echo Main API URL: %REACT_APP_MAIN_API%
echo Analytics API URL: %REACT_APP_ANALYTICS_API%
echo Logic API URL: %REACT_APP_LOGIC_URL%
echo Using direct analytics: %REACT_APP_USE_DIRECT_ANALYTICS%
echo.

cd frontend_service
npm start