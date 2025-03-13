#!/bin/bash

# Deploy script for the Instagram AI Leaderboard Frontend microservice to Render

echo "====================================================="
echo "Deploying Instagram AI Leaderboard Frontend to Render"
echo "====================================================="

# Check for render-cli installation
if ! command -v render &> /dev/null
then
    echo "render-cli is not installed. Installing..."
    npm install -g @render/cli
fi

# Authenticate with Render
echo "Authenticating with Render..."
render login

# Deploy using render.yaml
echo "Deploying services defined in render.yaml..."
render blueprint apply

echo "====================================================="
echo "Deployment process initiated!"
echo "Check the Render dashboard for deployment status."
echo "====================================================="