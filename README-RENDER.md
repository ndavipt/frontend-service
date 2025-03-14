# Deploying Instagram AI Leaderboard Frontend on Render

This document provides instructions for deploying the Instagram AI Leaderboard Frontend microservice on Render.com.

## Deployment Methods

There are two ways to deploy the frontend service on Render:

### 1. Using the Render Dashboard (Manual)

1. **Create a Web Service**
   - Log in to your Render dashboard
   - Click "New" and select "Web Service"
   - Connect your GitHub repository or select "Public Git repository" and enter the URL

2. **Configure the Service**
   - Set the Environment to "Docker"
   - Set a name for your service (e.g., insta-leaderboard-frontend)
   - Leave other settings at their defaults

3. **Set Environment Variables**
   - Add the following environment variables:
     - `REACT_APP_API_URL` - URL of your backend API (e.g., https://insta-leaderboard-api.onrender.com)
     - `REACT_APP_ANALYTICS_URL` - URL of your analytics service (e.g., https://insta-leaderboard-analytics.onrender.com)
     - `REACT_APP_LOGIC_URL` - URL of your Logic Service (e.g., https://logic-service.onrender.com)

4. **Deploy**
   - Click "Create Web Service"
   - Wait for the build and deployment to complete

### 2. Using render.yaml (Blueprint)

You can use the `render.yaml` file for automated deployment:

1. **Push the Code to a Repository**
   - Make sure the repository contains the `render.yaml` file

2. **Create a Blueprint Instance**
   - Log in to your Render dashboard
   - Click "New" and select "Blueprint"
   - Connect to your repository
   - Follow the prompts to deploy all services defined in the `render.yaml` file

3. **Update Environment Variables**
   - After deployment, you may need to update the environment variables to point to your actual services

## Monitoring and Management

After deployment:

1. **Check the Health**
   - Visit the `/health` endpoint to verify the service is running

2. **Logs**
   - Check the logs in the Render dashboard for any issues

3. **Scaling**
   - If needed, upgrade to a paid plan for better performance and more resources

## Updating the Deployment

To update the deployment:

1. **Push Changes to Your Repository**
   - Commit and push changes to the connected repository

2. **Manual Updates**
   - For manual deployments, click "Manual Deploy" > "Deploy Latest Commit" in the Render dashboard

3. **Auto-Deployment**
   - If auto-deploy is enabled, Render will automatically redeploy when changes are pushed to the main branch

## Troubleshooting

Common issues and solutions:

1. **Build Failures**
   - Check the build logs for errors
   - Verify that all dependencies are correctly specified in package.json

2. **Runtime Errors**
   - Check the runtime logs in the Render dashboard
   - Ensure environment variables are correctly set

3. **API Connection Issues**
   - Verify that the API endpoint URLs are correct
   - Ensure the backend services are running and accessible