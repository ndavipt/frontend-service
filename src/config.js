/**
 * Centralized configuration for the frontend application
 */

// API configuration
export const API_PORT = 5050;
export const API_URL = process.env.REACT_APP_API_URL || `http://localhost:${API_PORT}`;

// Scraper microservice URL (can be accessed directly or through proxy)
export const SCRAPER_API_URL = process.env.REACT_APP_SCRAPER_URL || 
                             (window._env_ && window._env_.REACT_APP_SCRAPER_URL) || 
                             'https://scraper-service-907s.onrender.com';

// Logic Service URL - handles all data analytics
export const LOGIC_SERVICE_URL = process.env.REACT_APP_LOGIC_URL || 
                               (window._env_ && window._env_.REACT_APP_LOGIC_URL) || 
                               '/logic';  // Use local proxy by default

// Direct Logic Service URL as fallback if proxy fails
export const DIRECT_LOGIC_SERVICE_URL = 'https://logic-service.onrender.com';

// API endpoints
export const API_ENDPOINTS = {
  leaderboard: '/api/leaderboard',
  trends: '/api/trends',
  accounts: '/api/accounts',
  submit: '/api/submit',
  scrape: '/api/scrape',
  testData: '/api/test-data',
  testTrends: '/api/test-trends'
};

// Logic Service API endpoints
export const LOGIC_API = {
  accounts: '/api/v1/accounts/',
  profiles: '/api/v1/profiles/',
  currentProfile: '/api/v1/profiles/current/',
  profileHistory: '/api/v1/profiles/history/',
  growth: '/api/v1/analytics/growth/',
  changes: '/api/v1/analytics/changes/',
  rollingAverage: '/api/v1/analytics/rolling-average/',
  compare: '/api/v1/analytics/compare'
};

// Image paths
export const IMAGE_ROUTE = '/images';
export const DATA_IMAGE_PATH = '/data/image_cache';

/**
 * Generate a UI avatar URL for fallback images
 * @param {string} name - The name to use for the avatar (defaults to 'AI')
 * @returns {string} - The avatar URL
 */
export const getAvatarUrl = (name = 'AI') => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E1306C&color=fff&size=150&bold=true`;
};

/**
 * Get the correct image URL based on the profile_img_url format
 * @param {string} profileImgUrl - The image URL from the profile data
 * @param {string} username - The username for fallback
 * @returns {string} - The resolved image URL
 */
export const getProfileImageUrl = (profileImgUrl, username) => {
  // If there's no profile image URL, use a placeholder
  if (!profileImgUrl) {
    return getAvatarUrl(username);
  }
  
  // Extract hash if using md5: or db: prefix
  if (profileImgUrl && (profileImgUrl.includes('md5:') || profileImgUrl.includes('db:'))) {
    // This is a cached image, extract the hash
    let hash;
    if (profileImgUrl.includes('md5:')) {
      hash = profileImgUrl.replace('md5:', '');
    } else {
      hash = profileImgUrl.replace('db:', '');
    }
    
    // Try using the images endpoint first (connects to database)
    return `${IMAGE_ROUTE}/${hash}.jpg`;
  } else if (profileImgUrl && profileImgUrl.startsWith('http')) {
    // This is a direct URL from Instagram or the scraper service
    
    // Try to use the image directly first - most modern browsers support CORS now
    return profileImgUrl;
    
    // Fallback method if CORS is an issue:
    // For better security and to avoid CORS issues, we'll proxy the image through our backend
    // const encodedUrl = encodeURIComponent(profileImgUrl);
    // return `/api/proxy-image?url=${encodedUrl}`;
  } else if (profileImgUrl && !profileImgUrl.includes(':')) {
    // This might be a simple ID or hash from the scraper
    // We'll route it through our image endpoint
    return `${IMAGE_ROUTE}/${profileImgUrl}`;
  }
  
  // If we don't recognize the format, use a placeholder
  return getAvatarUrl(username);
};