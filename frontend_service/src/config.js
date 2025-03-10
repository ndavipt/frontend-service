/**
 * Configuration for frontend service
 */

// API endpoints for different services
const API_CONFIG = {
  // Main backend API
  MAIN_API: process.env.REACT_APP_MAIN_API || 'http://localhost:5050',
  
  // Analytics service API
  ANALYTICS_API: process.env.REACT_APP_ANALYTICS_API || 'http://localhost:5052',
  
  // Scraper service API (usually accessed through main API gateway)
  SCRAPER_API: process.env.REACT_APP_SCRAPER_API || 'https://scraper-service-907s.onrender.com'
};

// Feature flags
const FEATURES = {
  USE_DIRECT_ANALYTICS: process.env.REACT_APP_USE_DIRECT_ANALYTICS === 'true' || false,
  ENABLE_TEST_FEATURES: process.env.REACT_APP_ENABLE_TEST_FEATURES === 'true' || false
};

// App metadata
const APP_CONFIG = {
  APP_NAME: 'Instagram AI Leaderboard',
  APP_VERSION: '1.0.0',
  CONTACT_EMAIL: 'admin@example.com'
};

export { API_CONFIG, FEATURES, APP_CONFIG };