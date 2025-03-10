@echo off
echo ===================================================
echo Starting Instagram AI Leaderboard Analytics Service
echo ===================================================
echo.

set FLASK_APP=app.py
set FLASK_ENV=development
set PORT=5052
set SCRAPER_SERVICE_URL=https://scraper-service-907s.onrender.com

cd analytics_service
python app.py