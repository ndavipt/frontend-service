import axios from 'axios';
import { API_CONFIG, FEATURES } from '../config';

// Main API instance (backend gateway)
const mainApi = axios.create({
  baseURL: API_CONFIG.MAIN_API,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Direct Analytics API instance (when needed)
const analyticsApi = axios.create({
  baseURL: API_CONFIG.ANALYTICS_API,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Direct Scraper API instance (rarely used, mostly accessed through main API)
const scraperApi = axios.create({
  baseURL: API_CONFIG.SCRAPER_API,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add cache busting to requests
const addCacheBuster = (url) => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_=${Date.now()}`;
};

// API functions

// Get leaderboard data
export const getLeaderboard = async (forceRefresh = false) => {
  try {
    const url = forceRefresh ? '/api/leaderboard?refresh=true' : '/api/leaderboard';
    const response = await mainApi.get(addCacheBuster(url));
    return response.data;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
};

// Get growth statistics
export const getGrowthStats = async () => {
  try {
    // Decide whether to use direct analytics API or go through main API
    if (FEATURES.USE_DIRECT_ANALYTICS) {
      const response = await analyticsApi.get(addCacheBuster('/growth'));
      return response.data;
    } else {
      const response = await mainApi.get(addCacheBuster('/api/analytics/growth'));
      return response.data;
    }
  } catch (error) {
    console.error('Error fetching growth stats:', error);
    throw error;
  }
};

// Get trend data
export const getTrends = async (useAnalytics = false) => {
  try {
    const url = useAnalytics ? '/api/trends?analytics=true' : '/api/trends';
    const response = await mainApi.get(addCacheBuster(url));
    return response.data;
  } catch (error) {
    console.error('Error fetching trends:', error);
    throw error;
  }
};

// Get account list
export const getAccounts = async () => {
  try {
    const response = await mainApi.get(addCacheBuster('/api/accounts'));
    return response.data;
  } catch (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }
};

// Submit new account
export const submitAccount = async (username) => {
  try {
    const response = await mainApi.post('/api/submit', { username });
    return response.data;
  } catch (error) {
    console.error('Error submitting account:', error);
    throw error;
  }
};

// Trigger manual scrape
export const triggerScrape = async () => {
  try {
    const response = await mainApi.post('/api/scrape');
    return response.data;
  } catch (error) {
    console.error('Error triggering scrape:', error);
    throw error;
  }
};

// Check service status
export const checkServiceStatus = async () => {
  try {
    const response = await mainApi.get(addCacheBuster('/api/service-status'));
    return response.data;
  } catch (error) {
    console.error('Error checking service status:', error);
    throw error;
  }
};

export default {
  getLeaderboard,
  getGrowthStats,
  getTrends,
  getAccounts,
  submitAccount,
  triggerScrape,
  checkServiceStatus
};