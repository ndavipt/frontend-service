import axios from 'axios';
import { API_PORT, API_URL as CONFIG_API_URL, API_ENDPOINTS } from '../config';

// Determine if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

// Check for runtime environment variables from window._env_ (set by Docker)
const runtimeEnv = window._env_ || {};

// Configure API URL - priority order:
// 1. Runtime env from window._env_ (set by Docker)
// 2. Environment variable from build time
// 3. Config default value or development fallback
const API_URL = runtimeEnv.REACT_APP_API_URL || 
                process.env.REACT_APP_API_URL || 
                CONFIG_API_URL || 
                (isDev ? `http://localhost:${API_PORT}` : '');

// Create an Axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} from ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return Promise.reject(error);
  }
);

// API functions for various endpoints

// Simple test function to verify API connection
export const testApiConnection = async () => {
  try {
    const response = await api.get('/api/test');
    console.log('API connection test successful:', response.data);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('API connection test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const fetchLeaderboard = async (forceRefresh = false) => {
  try {
    // Add a cache busting parameter when force refresh is requested
    const params = forceRefresh ? { _t: Date.now() } : {};
    
    try {
      // First try using the standard API endpoint
      const response = await api.get(API_ENDPOINTS.leaderboard, { params });
      
      // Log follower change stats for debugging
      if (response.data && response.data.leaderboard) {
        const profiles = response.data.leaderboard;
        const changesCount = profiles.filter(p => p.follower_change !== 0).length;
        console.log(`Leaderboard data contains ${profiles.length} profiles, ${changesCount} with non-zero follower changes`);
        
        // Log a few examples of follower changes for debugging
        const examples = profiles.slice(0, 3).map(p => `${p.username}: ${p.follower_change}`);
        console.log(`Example follower changes: ${examples.join(', ')}`);
      }
      
      return response.data;
    } catch (error) {
      console.log('Error fetching from primary API, trying scraper service directly', error);
      
      // If the primary API fails, try fetching directly from the scraper service
      const scraperUrl = process.env.REACT_APP_SCRAPER_URL || 
                        (window._env_ && window._env_.REACT_APP_SCRAPER_URL) || 
                        'https://scraper-service-907s.onrender.com';
                        
      console.log(`Trying scraper service at ${scraperUrl}/profiles`);
      const scraperResponse = await axios.get(`${scraperUrl}/profiles`);
      
      if (Array.isArray(scraperResponse.data)) {
        // Format the data to match our expected structure
        // The scraper service returns an array of profiles directly
        const formattedData = {
          leaderboard: scraperResponse.data.map((profile, index) => ({
            username: profile.username,
            bio: profile.biography || '',
            follower_count: profile.follower_count,
            profile_img_url: profile.profile_pic_url,
            follower_change: 0, // No change data available from scraper directly
            rank: index + 1
          })),
          updated_at: new Date().toISOString()
        };
        
        console.log(`Successfully retrieved ${formattedData.leaderboard.length} profiles from scraper service`);
        return formattedData;
      } else {
        throw new Error('Unexpected response format from scraper service');
      }
    }
  } catch (error) {
    console.error('Error fetching leaderboard from all sources:', error);
    throw error;
  }
};

export const fetchTrends = async (forceRefresh = false) => {
  try {
    // Add a cache busting parameter when force refresh is requested
    const params = forceRefresh ? { _t: Date.now() } : {};
    const response = await api.get(API_ENDPOINTS.trends, { params });
    
    // Log trend data stats for debugging
    if (response.data && response.data.trends) {
      console.log(`Received trends data for ${response.data.trends.length} profiles`);
      
      // Check if we have follower_counts arrays with actual data
      const withHistoricalData = response.data.trends.filter(
        t => t.follower_counts && t.follower_counts.length > 1
      ).length;
      
      console.log(`Profiles with historical trend data: ${withHistoricalData}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching trends:', error);
    // Return minimal data to prevent UI from breaking
    return { trends: [], dates: [] };
  }
};

// Test endpoints for follower growth testing
export const fetchTestData = async () => {
  try {
    const response = await api.get('/api/test-data');
    return response.data;
  } catch (error) {
    console.error('Error fetching test data:', error);
    return { leaderboard: [], updated_at: new Date().toISOString() };
  }
};

export const fetchTestTrends = async () => {
  try {
    const response = await api.get('/api/test-trends');
    return response.data;
  } catch (error) {
    console.error('Error fetching test trends:', error);
    return { trends: [], dates: [] };
  }
};

export const fetchAccounts = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.accounts);
    return response.data;
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return { accounts: [] };
  }
};

export const submitAccount = async (username, submitter = 'Anonymous') => {
  const response = await api.post(API_ENDPOINTS.submit, { username, submitter });
  return response.data;
};

// Admin API endpoints
export const fetchPendingAccounts = async () => {
  const response = await api.get('/api/admin/pending');
  return response.data;
};

export const fetchTrackedAccounts = async () => {
  const response = await api.get('/api/admin/tracked');
  return response.data;
};

export const approveAccount = async (username) => {
  const response = await api.post('/api/admin/approve', { username });
  return response.data;
};

export const rejectAccount = async (username) => {
  const response = await api.post('/api/admin/reject', { username });
  return response.data;
};

export const removeAccount = async (username) => {
  const response = await api.post('/api/admin/remove', { username });
  return response.data;
};

export default api;