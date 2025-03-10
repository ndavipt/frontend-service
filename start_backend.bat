@echo off
echo Starting Instagram AI Leaderboard API Server...
echo Serving on http://localhost:5050
echo ===========================================
echo.

set PYTHONPATH=%PYTHONPATH%;%~dp0
python app.py