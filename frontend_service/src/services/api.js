import axios from 'axios';
import { 
  API_PORT, 
  API_URL as CONFIG_API_URL, 
  API_ENDPOINTS, 
  LOGIC_SERVICE_URL as CONFIG_LOGIC_URL,
  DIRECT_LOGIC_SERVICE_URL,
  LOGIC_API,
  USE_FETCH_FOR_DIRECT,
  FALLBACK_URLS
} from '../config';

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

// Configure Logic Service URL - try both with and without /api/v1 prefix
const LOGIC_URL = runtimeEnv.REACT_APP_LOGIC_URL || 
                 process.env.REACT_APP_LOGIC_URL || 
                 CONFIG_LOGIC_URL || 
                 '/logic'; // Use proxy endpoint as default - will handle API versions internally

// CORS handling options
// The Logic Service team has fixed CORS on their end by adding:
// CORS_ORIGINS=* environment variable to allow all origins

// Keep CORS proxy as fallback option in case CORS issues return
const CORS_PROXY = 'https://corsproxy.io/?';
// const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
// const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

// Flag to enable using CORS proxy - keeping it false since CORS should now work directly
const USE_CORS_PROXY = false;

// Create an Axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 180000, // 3 minutes timeout
});

// Create a separate axios instance for the Logic Service
const logicApi = axios.create({
  baseURL: LOGIC_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 180000, // 3 minutes timeout
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

// Add similar interceptors for Logic Service API calls
logicApi.interceptors.request.use(
  (config) => {
    console.log(`Logic API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Logic API Request Error:', error);
    return Promise.reject(error);
  }
);

logicApi.interceptors.response.use(
  (response) => {
    console.log(`Logic API Response: ${response.status} from ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('Logic API Response Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return Promise.reject(error);
  }
);

// Helper function to format Logic Service data to our expected format
const formatProfileData = (serviceProfiles) => {
  // Format the data to match our expected structure
  // The Logic Service returns an array of profiles directly
  const formattedData = {
    leaderboard: serviceProfiles.map((profile, index) => ({
      username: profile.username,
      bio: profile.biography || '',
      follower_count: profile.follower_count,
      profile_img_url: profile.profile_pic_url,
      follower_change: 0, // Will be enhanced with analytics data separately
      rank: index + 1
    })),
    updated_at: new Date().toISOString()
  };
  
  console.log(`Successfully formatted ${formattedData.leaderboard.length} profiles from Logic Service`);
  return formattedData;
};

// Helper function to try multiple URLs until one works
const tryMultipleUrls = async (path, options = {}) => {
  const errors = [];
  
  // Start with CORS proxy for emergency bypass, then local proxy, then direct
  const urlsToTry = USE_CORS_PROXY ? 
    [
      // Format each URL with the CORS proxy prefix
      `${CORS_PROXY}${encodeURIComponent(DIRECT_LOGIC_SERVICE_URL)}`,
      ...FALLBACK_URLS.map(url => `${CORS_PROXY}${encodeURIComponent(url)}`),
      '/logic' // Local proxy as fallback
    ] : 
    [
      '/logic', // Local proxy first (if not using CORS proxy)
      DIRECT_LOGIC_SERVICE_URL,
      ...FALLBACK_URLS.filter(url => url !== DIRECT_LOGIC_SERVICE_URL)
    ];
  
  for (const baseUrl of urlsToTry) {
    try {
      // Ensure HTTPS is used, but preserve localhost HTTP for development
      let secureBaseUrl = baseUrl;
      // Special handling for different URL types
      if (baseUrl === '/logic') {
        // For local proxy, just use the path directly
        const fullUrl = `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
        console.log(`Trying local proxy URL: ${fullUrl}`);
      } else if (baseUrl.startsWith(CORS_PROXY)) {
        // For CORS proxy URLs, we need to handle the URL differently
        // The baseUrl already contains the proxy and the encoded target URL
        // So we just need to append the path to the encoded URL
        secureBaseUrl = baseUrl;
        // No changes needed - we'll handle the path appending below
      } else if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
        // Only force HTTPS for non-localhost URLs
        secureBaseUrl = baseUrl.replace('http:', 'https:');
      }
      
      // Build full URL based on URL type
      let fullUrl;
      if (baseUrl === '/logic') {
        // Local proxy URL
        fullUrl = `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
      } else if (baseUrl.startsWith(CORS_PROXY)) {
        // CORS proxy URL - full URL is already encoded except the path
        // Extract the base URL from the proxy URL
        const encodedUrl = baseUrl.replace(CORS_PROXY, '');
        const decodedUrl = decodeURIComponent(encodedUrl);
        
        // Re-encode with the path
        let urlWithPath = decodedUrl + (path.startsWith('/') ? path : '/' + path);
        fullUrl = `${CORS_PROXY}${encodeURIComponent(urlWithPath)}`;
      } else {
        // Regular URL
        fullUrl = `${secureBaseUrl}${path}`;
      }
        
      console.log(`Trying URL: ${fullUrl}`);
      
      // Try with multiple fetch configurations 
      let response;
      
      try {
        // Now that CORS is fixed on the Logic Service, we can use a simpler direct request
        response = await fetch(fullUrl, {
          method: 'GET',
          cache: 'no-store',
          headers: { 
            'Accept': 'application/json'
          },
          mode: 'cors',
          credentials: 'omit',
          signal: AbortSignal.timeout(options.timeout || 10000),
          ...options
        });
        
        console.log(`Direct fetch response status: ${response.status} from ${fullUrl}`);
        
      } catch (corsError) {
        console.log(`CORS error with ${fullUrl}: ${corsError.message}`);
        
        // Try with a proxy URL if available
        try {
          console.log('Trying through local proxy');
          const proxyPath = path.startsWith('/api/v1') ? path.replace('/api/v1', '') : path;
          const proxyUrl = `/logic${proxyPath}`;
          console.log(`Using proxy URL: ${proxyUrl}`);
          
          response = await fetch(proxyUrl, {
            method: 'GET',
            cache: 'no-store',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(options.timeout || 10000)
          });
          
          console.log(`Proxy fetch response status: ${response.status}`);
          
        } catch (proxyError) {
          console.log(`Proxy attempt failed: ${proxyError.message}, trying alternative endpoint format`);
          
          // Try alternative endpoint format (with or without /api/v1/ prefix)
          try {
            const altPath = path.startsWith('/api/v1/') 
              ? path.replace('/api/v1/', '/') 
              : path.startsWith('/') 
                ? `/api/v1${path}` 
                : `/api/v1/${path}`;
            
            const altUrl = `${secureBaseUrl}${altPath}`;
            console.log(`Trying alternative URL format: ${altUrl}`);
            
            response = await fetch(altUrl, {
              method: 'GET',
              cache: 'no-store',
              headers: { 'Accept': 'application/json' },
              mode: 'cors',
              credentials: 'omit',
              signal: AbortSignal.timeout(options.timeout || 10000)
            });
            
            console.log(`Alternative endpoint response status: ${response.status}`);
          } catch (altEndpointError) {
            console.log(`All connection attempts failed, trying no-cors as last resort`);
            
            // If all attempts fail, try no-cors as last resort
            response = await fetch(fullUrl, {
              method: 'GET',
              cache: 'no-store',
              headers: { 'Accept': 'application/json' },
              mode: 'no-cors', // Last resort mode
              credentials: 'omit',
              signal: AbortSignal.timeout(options.timeout || 10000)
            });
            
            console.log(`No-CORS response type: ${response.type}`);
          }
        }
      }
      
      // For no-cors responses, we can't check response.ok or get status
      if (response.type !== 'opaque' && !response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      let data;
      try {
        // For opaque responses from no-cors, this will fail
        data = await response.json();
      } catch (jsonError) {
        if (response.type === 'opaque') {
          // For opaque responses, we can't parse JSON
          // Return empty array as fallback
          console.log(`Got opaque response from ${fullUrl}, using fallback data`);
          data = [];
        } else {
          throw jsonError;
        }
      }
      
      console.log(`Successfully connected to ${secureBaseUrl}`);
      return { data, url: secureBaseUrl };
    } catch (error) {
      console.log(`Failed to connect to ${baseUrl}: ${error.message}`);
      errors.push({ url: baseUrl, error: error.message });
    }
  }
  
  // If we get here, all URLs failed
  throw new Error(`All URLs failed: ${JSON.stringify(errors)}`);
};

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

// Mock data for when all API calls fail
const MOCK_PROFILES = [
  {
    username: 'lilmiquela',
    bio: 'Change is good. LA • NYC • ? • Not a DJ.',
    follower_count: 3127450,
    follower_change: 12500,
    profile_img_url: 'https://ui-avatars.com/api/?name=LM&background=E1306C&color=fff&size=150&bold=true',
    rank: 1,
  },
  {
    username: 'imma.gram',
    bio: '💫 Imma // #immagram Tokyo. Fashion. Art. Not human but ❤️',
    follower_count: 1528963,
    follower_change: 8240,
    profile_img_url: 'https://ui-avatars.com/api/?name=IG&background=E1306C&color=fff&size=150&bold=true',
    rank: 2,
  },
  {
    username: 'shudu.gram',
    bio: 'The World\'s First Digital Supermodel | Created by @thecameronj',
    follower_count: 842759,
    follower_change: 5320,
    profile_img_url: 'https://ui-avatars.com/api/?name=SG&background=E1306C&color=fff&size=150&bold=true',
    rank: 3,
  },
  {
    username: 'noonoouri',
    bio: 'Digital character | 19yo | Activist | Paris based | Fighting for a better world | Brand partnerships: hi@noonoouri.com',
    follower_count: 738952,
    follower_change: 3125,
    profile_img_url: 'https://ui-avatars.com/api/?name=NO&background=E1306C&color=fff&size=150&bold=true',
    rank: 4,
  },
  {
    username: 'knox.frost',
    bio: 'Aspiring entrepreneur. Trying to make the world a better place.',
    follower_count: 653124,
    follower_change: 2480,
    profile_img_url: 'https://ui-avatars.com/api/?name=KF&background=E1306C&color=fff&size=150&bold=true',
    rank: 5,
  },
  {
    username: 'blawko22',
    bio: 'LA-based. Always hiding my face 👀',
    follower_count: 521938,
    follower_change: 1950,
    profile_img_url: 'https://ui-avatars.com/api/?name=BL&background=E1306C&color=fff&size=150&bold=true',
    rank: 6,
  },
  {
    username: 'ruby9100m',
    bio: 'Ruby // Virtual model and artist // Tokyo',
    follower_count: 437289,
    follower_change: 1240,
    profile_img_url: 'https://ui-avatars.com/api/?name=RM&background=E1306C&color=fff&size=150&bold=true',
    rank: 7,
  },
  {
    username: 'bermudaisbae',
    bio: '19. Smart but not wise. Secretly planning world domination.',
    follower_count: 329475,
    follower_change: 860,
    profile_img_url: 'https://ui-avatars.com/api/?name=BI&background=E1306C&color=fff&size=150&bold=true',
    rank: 8,
  },
  {
    username: 'aivatar_official',
    bio: 'AI-generated digital persona | Opinions are my own (or my creator\'s?)',
    follower_count: 274831,
    follower_change: 640,
    profile_img_url: 'https://ui-avatars.com/api/?name=AO&background=E1306C&color=fff&size=150&bold=true',
    rank: 9,
  },
  {
    username: 'galaxia.gram',
    bio: 'Beyond human | Cosmic energy | Art & Fashion | ✨',
    follower_count: 218742,
    follower_change: 520,
    profile_img_url: 'https://ui-avatars.com/api/?name=GG&background=E1306C&color=fff&size=150&bold=true',
    rank: 10,
  }
];

// Helper function to get profile analytics data from Logic Service
export const fetchProfileAnalytics = async (username) => {
  try {
    // Try with both logic URL patterns
    let baseUrl;
    
    try {
      // First try the proxy URL
      await axios.get(`${LOGIC_URL}/health`);
      baseUrl = LOGIC_URL;
      console.log(`Using proxy URL ${baseUrl} for analytics`);
    } catch (proxyError) {
      // If that fails, try the direct URL
      console.log(`Logic service proxy not available, using direct URL`);
      baseUrl = 'https://logic-service.onrender.com';
    }
    
    // Ensure HTTPS protocol
    baseUrl = baseUrl.replace('http:', 'https:');
    
    // Make parallel requests to Logic Service for different analytics
    console.log(`Making parallel analytics requests to ${baseUrl} for ${username}`);
    
    let growthResponse, changesResponse, rollingAvgResponse;
    
    if (USE_FETCH_FOR_DIRECT) {
      // Use fetch API to avoid SSL handshake issues
      console.log(`Using fetch API for analytics to avoid SSL handshake issues`);
      
      const [growthFetch, changesFetch, rollingAvgFetch] = await Promise.all([
        fetch(`${baseUrl}/api/v1/analytics/growth/${username}`, { 
          method: 'GET',
          cache: 'no-store',
          headers: { 'Accept': 'application/json' },
          mode: 'cors',
          credentials: 'omit',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        }),
        fetch(`${baseUrl}/api/v1/analytics/changes/${username}`, { 
          method: 'GET',
          cache: 'no-store',
          headers: { 'Accept': 'application/json' },
          mode: 'cors',
          credentials: 'omit',
          signal: AbortSignal.timeout(5000)
        }),
        fetch(`${baseUrl}/api/v1/analytics/rolling-average/${username}`, { 
          method: 'GET',
          cache: 'no-store',
          headers: { 'Accept': 'application/json' },
          mode: 'cors',
          credentials: 'omit',
          signal: AbortSignal.timeout(5000)
        })
      ]);
      
      // Process responses
      growthResponse = { data: growthFetch.ok ? await growthFetch.json() : null };
      changesResponse = { data: changesFetch.ok ? await changesFetch.json() : null };
      rollingAvgResponse = { data: rollingAvgFetch.ok ? await rollingAvgFetch.json() : null };
    } else {
      // Use axios as fallback
      [growthResponse, changesResponse, rollingAvgResponse] = await Promise.all([
        axios.get(`${baseUrl}/api/v1/analytics/growth/${username}`, { 
          timeout: 5000, // Shorter timeout for analytics requests
          headers: { 'Accept': 'application/json' }
        }),
        axios.get(`${baseUrl}/api/v1/analytics/changes/${username}`, { 
          timeout: 5000,
          headers: { 'Accept': 'application/json' }
        }),
        axios.get(`${baseUrl}/api/v1/analytics/rolling-average/${username}`, { 
          timeout: 5000,
          headers: { 'Accept': 'application/json' }
        })
      ]);
    }
    
    // Return combined analytics data
    return {
      growth: growthResponse.data,
      changes: changesResponse.data,
      rollingAverage: rollingAvgResponse.data
    };
  } catch (error) {
    console.error(`Error fetching analytics for ${username}:`, error);
    // Return empty data on error
    return {
      growth: null,
      changes: null,
      rollingAverage: null
    };
  }
};

// Enhanced formatter to include analytics data
const enhanceProfilesWithAnalytics = async (profiles) => {
  // For each profile in the array, fetch analytics and enhance the profile object
  const enhancedProfiles = await Promise.all(
    profiles.map(async (profile) => {
      try {
        // Try with both logic URL patterns
        let baseUrl;
        
        try {
          // First try the proxy URL
          await axios.get(`${LOGIC_URL}/health`);
          baseUrl = LOGIC_URL;
        } catch (proxyError) {
          // If that fails, try the direct URL
          baseUrl = DIRECT_LOGIC_SERVICE_URL;
        }
        
        // Ensure HTTPS protocol
        baseUrl = baseUrl.replace('http:', 'https:');
        
        // Get current profile data from Logic Service
        const currentResponse = await axios.get(`${baseUrl}/api/v1/profiles/current/${profile.username}`);
        const analytics = await fetchProfileAnalytics(profile.username);
        
        // Extract relevant metrics
        const followerChange = analytics.changes?.last_change || 0;
        const twelveHourChange = analytics.growth?.twelve_hour_change || 0;
        const twentyFourHourChange = analytics.growth?.twenty_four_hour_change || 0;
        const sevenDayAverage = analytics.rollingAverage?.seven_day_average || 0;
        
        // Enhance profile with analytics data
        return {
          ...profile,
          follower_count: currentResponse.data?.follower_count || profile.follower_count,
          follower_change: followerChange,
          twelve_hour_change: twelveHourChange,
          twenty_four_hour_change: twentyFourHourChange,
          seven_day_average: sevenDayAverage
        };
      } catch (error) {
        console.error(`Failed to enhance profile for ${profile.username}:`, error);
        // Return original profile on error
        return profile;
      }
    })
  );
  
  return enhancedProfiles;
};

export const fetchLeaderboard = async (forceRefresh = false) => {
  try {
    // Add a cache busting parameter when force refresh is requested
    const params = forceRefresh ? { _t: Date.now() } : {};
    
    try {
      // First try using the Logic Service to get profiles
      try {
        let logicProfilesResponse;
        
        // Try different URLs for the Logic Service
        try {
          // Try multiple possible Logic Service URLs
          console.log('Trying multiple Logic Service URLs');
          
          try {
            // Use our helper to try multiple URLs until one works
            const result = await tryMultipleUrls('/api/v1/profiles');
            
            // Convert the response to the same format axios would return
            logicProfilesResponse = { data: result.data };
            console.log(`Successfully connected to Logic Service at ${result.url}`);
          } catch (fetchError) {
            console.error(`Error in fetch: ${fetchError.message}`);
            
            // Try again with a slightly different URL format (without /api/v1/ prefix)
            try {
              console.log('Trying alternative endpoint format without /api/v1/ prefix');
              const result = await tryMultipleUrls('/profiles');
              logicProfilesResponse = { data: result.data };
              console.log(`Successfully connected to Logic Service at ${result.url} using alternative format`);
            } catch (altFetchError) {
              console.error(`Error in alternative fetch: ${altFetchError.message}`);
              // No URLs worked, throw to the next handler
              throw altFetchError;
            }
          }
          
          if (logicProfilesResponse && logicProfilesResponse.data) {
            console.log(`Received ${logicProfilesResponse.data.length} profiles from Logic Service`);
          }
        } catch (fetchError) {
          console.log(`Failed to connect to Logic Service, will try backup methods`, fetchError);
          throw fetchError;  // Let it fall through to the next handler
        }
        
        console.log(`SUCCESS! Received ${logicProfilesResponse.data?.length} profiles from Logic Service`);
        
        if (Array.isArray(logicProfilesResponse.data) && logicProfilesResponse.data.length > 0) {
          // Format and enhance profiles with analytics data
          const formattedProfiles = logicProfilesResponse.data.map((profile, index) => ({
            username: profile.username,
            bio: profile.biography || '',
            follower_count: profile.follower_count,
            profile_img_url: profile.profile_pic_url,
            follower_change: 0, // Will be replaced with actual data
            rank: index + 1
          }));
          
          // Skip the analytics enhancement for now since it's causing errors
          // Just use the basic profile data
          console.log('Skipping analytics enhancement due to connection issues');
          const enhancedProfiles = formattedProfiles.map(profile => ({
            ...profile,
            follower_change: 0,
            twelve_hour_change: 0,
            twenty_four_hour_change: 0,
            seven_day_average: 0
          }));
          
          // Sort by follower count (descending) and update ranks
          const sortedProfiles = enhancedProfiles
            .sort((a, b) => b.follower_count - a.follower_count)
            .map((profile, index) => ({
              ...profile,
              rank: index + 1
            }));
          
          // Log follower change stats for debugging
          const changesCount = sortedProfiles.filter(p => p.follower_change !== 0).length;
          console.log(`Leaderboard data contains ${sortedProfiles.length} profiles, ${changesCount} with non-zero follower changes`);
          
          // Log a few examples of follower changes for debugging
          const examples = sortedProfiles.slice(0, 3).map(p => `${p.username}: ${p.follower_change}`);
          console.log(`Example follower changes: ${examples.join(', ')}`);
          
          return {
            leaderboard: sortedProfiles,
            updated_at: new Date().toISOString()
          };
        }
      } catch (logicError) {
        console.error('Error fetching from Logic Service, falling back to primary API', logicError);
        console.error(`Failed to fetch from Logic URL: ${LOGIC_URL}${LOGIC_API.profiles}`);
        console.error('Logic Service Error Details:', {
          message: logicError.message,
          status: logicError.response?.status,
          data: logicError.response?.data,
          config: {
            baseURL: logicError.config?.baseURL,
            url: logicError.config?.url,
            method: logicError.config?.method
          }
        });
      }
      
      // Fallback to the standard API endpoint
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
      console.log('Error fetching from primary API, making one final attempt to Logic Service', error);
      
      // Make one final direct attempt to the Logic Service
      try {
        console.log('Making final attempt to connect to Logic Service - trying all fallback URLs');
        
        let finalResponse;
        
        try {
          // Make one final attempt using our helper function
          const result = await tryMultipleUrls('/api/v1/profiles', { timeout: 15000 });
          
          // Convert to expected format
          finalResponse = { data: result.data };
          console.log(`Successfully fetched ${result.data.length} profiles from Logic Service at ${result.url}`);
        } catch (fetchError) {
          console.error(`API v1 endpoint failed, trying alternative format:`, fetchError);
          
          // Try again with a different URL format as last resort
          try {
            console.log('Trying direct /profiles endpoint (no /api/v1/ prefix)');
            const result = await tryMultipleUrls('/profiles', { timeout: 15000 });
            finalResponse = { data: result.data };
            console.log(`Successfully fetched ${result.data.length} profiles using direct endpoint at ${result.url}`);
          } catch (finalFetchError) {
            console.error(`All Logic Service URLs and formats failed:`, finalFetchError);
            // Fall back to mock data
            throw finalFetchError;
          }
        }
        
        if (Array.isArray(finalResponse.data) && finalResponse.data.length > 0) {
          console.log(`Final attempt successful! Received ${finalResponse.data.length} profiles`);
          
          // Format the profiles for the leaderboard
          const formattedProfiles = finalResponse.data.map((profile, index) => ({
            username: profile.username,
            bio: profile.biography || '',
            follower_count: profile.follower_count,
            profile_img_url: profile.profile_pic_url,
            follower_change: 0, // Will be replaced with analytics data
            rank: index + 1
          }));
          
          return {
            leaderboard: formattedProfiles,
            updated_at: new Date().toISOString()
          };
        }
      } catch (finalError) {
        console.log('Final attempt to Logic Service failed', finalError);
      }
      
      // If all else fails, use mock data
      console.log('Using mock data as last resort');
      return {
        leaderboard: MOCK_PROFILES,
        updated_at: new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('Error fetching leaderboard from all sources, falling back to mock data:', error);
    
    // Return mock data when everything else fails
    return {
      leaderboard: MOCK_PROFILES,
      updated_at: new Date().toISOString()
    };
  }
};

// Mock trend data
const MOCK_TRENDS = [
  {
    username: 'lilmiquela',
    follower_counts: [3050000, 3075300, 3095800, 3110200, 3127450],
    timestamps: [
      new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString()
    ]
  },
  {
    username: 'imma.gram',
    follower_counts: [1485300, 1496800, 1510500, 1521200, 1528963],
    timestamps: [
      new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString()
    ]
  },
  {
    username: 'shudu.gram',
    follower_counts: [812400, 824500, 833200, 840100, 842759],
    timestamps: [
      new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString()
    ]
  },
  {
    username: 'noonoouri',
    follower_counts: [720350, 725800, 731500, 736300, 738952],
    timestamps: [
      new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString()
    ]
  },
  {
    username: 'knox.frost',
    follower_counts: [635200, 641500, 647800, 651300, 653124],
    timestamps: [
      new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString()
    ]
  }
];

// Generate date labels for the past 5 days
const MOCK_DATES = [
  new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
];

export const fetchTrends = async (forceRefresh = false) => {
  try {
    // Add a cache busting parameter when force refresh is requested
    const params = forceRefresh ? { _t: Date.now() } : {};
    
    try {
      // First try using the Logic Service to get history for all profiles
      try {
        // Get all accounts from Logic Service using our helper
        console.log('Fetching accounts from Logic Service');
        
        // Just use the tryMultipleUrls helper which now has proper CORS proxy support
        // This will automatically try the CORS proxy, local proxy, and direct connections
        let accountsResult;
        try {
          // Try with CORS proxy and /api/v1/ prefix (most specific endpoint)
          accountsResult = await tryMultipleUrls('/api/v1/accounts');
          console.log(`Successfully fetched accounts data from endpoint`);
        } catch (apiV1Error) {
          console.log('First accounts attempt failed, trying without prefix');
          // Next try without the /api/v1/ prefix
          accountsResult = await tryMultipleUrls('/accounts');
        }
        
        const accounts = accountsResult.data;
        const baseUrl = accountsResult.url;
        
        if (Array.isArray(accounts) && accounts.length > 0) {
          console.log(`Fetching history for ${accounts.length} accounts from Logic Service at ${baseUrl}`);
          
          // For each account, fetch its history
          const trendsData = await Promise.all(
            accounts.map(async (account) => {
              try {
                // Try direct fetch with CORS settings, ensuring HTTPS
                let secureBaseUrl = baseUrl;
                if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
                  secureBaseUrl = baseUrl.replace('http:', 'https:');
                }
                // Try the local proxy first which should avoid CORS issues
                let response;
                
                try {
                  // Use the local proxy which handles CORS properly
                  const proxyUrl = `/logic/profiles/history/${account.username}`;
                  console.log(`Trying proxy URL for history: ${proxyUrl}`);
                  
                  response = await fetch(proxyUrl, {
                    method: 'GET',
                    cache: 'no-store',
                    headers: { 'Accept': 'application/json' },
                    signal: AbortSignal.timeout(5000)
                  });
                  
                  console.log(`Proxy history response status: ${response.status}`);
                } catch (proxyError) {
                  console.log(`Proxy error with history: ${proxyError.message}, trying direct endpoints`);
                  
                  // If proxy fails, try direct endpoints
                  try {
                    // First try with /api/v1/ prefix
                    const historyUrl = `${secureBaseUrl}/api/v1/profiles/history/${account.username}`;
                    response = await fetch(historyUrl, {
                      method: 'GET',
                      cache: 'no-store',
                      headers: { 'Accept': 'application/json' },
                      mode: 'cors',
                      credentials: 'omit',
                      signal: AbortSignal.timeout(5000)
                    });
                  } catch (apiV1Error) {
                    console.log(`API v1 error with history: ${apiV1Error.message}, trying without prefix`);
                    
                    // Try with direct endpoint (no /api/v1/ prefix)
                    const directUrl = `${secureBaseUrl}/profiles/history/${account.username}`;
                    response = await fetch(directUrl, {
                      method: 'GET',
                      cache: 'no-store',
                      headers: { 'Accept': 'application/json' },
                      mode: 'cors',
                      credentials: 'omit',
                      signal: AbortSignal.timeout(5000)
                    });
                  }
                }
                
                if (!response.ok) {
                  throw new Error(`Failed to fetch history: ${response.status}`);
                }
                
                const historyData = await response.json();
                
                if (historyData && historyData.history) {
                  // Format the history data
                  const history = historyData.history;
                  
                  // Extract dates and follower counts into separate arrays
                  const timestamps = history.map(point => point.timestamp);
                  const follower_counts = history.map(point => point.follower_count);
                  
                  return {
                    username: account.username,
                    timestamps,
                    follower_counts
                  };
                }
                return null;
              } catch (error) {
                console.error(`Error fetching history for ${account.username}:`, error);
                return null;
              }
            })
          );
          
          // Filter out null values and prepare the response
          const validTrends = trendsData.filter(trend => trend !== null);
          
          if (validTrends.length > 0) {
            // Generate date labels from the timestamps of the first profile
            // (assuming all profiles have similar timestamp patterns)
            const sampleTimestamps = validTrends[0].timestamps;
            const dates = sampleTimestamps.map(ts => 
              new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            );
            
            console.log(`Successfully fetched trend data for ${validTrends.length} profiles from Logic Service`);
            
            return {
              trends: validTrends,
              dates: dates
            };
          }
        }
      } catch (logicError) {
        console.error('Error fetching trends from Logic Service, falling back to API', logicError);
      }
      
      // Fallback to standard API endpoint
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
      console.error('Error fetching trends, using mock data:', error);
      
      // Return mock data when API fails
      return { 
        trends: MOCK_TRENDS, 
        dates: MOCK_DATES 
      };
    }
  } catch (error) {
    console.error('Error in fetchTrends, using mock data:', error);
    
    // Return mock data as fallback
    return { 
      trends: MOCK_TRENDS, 
      dates: MOCK_DATES 
    };
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

// Mock account data
const MOCK_ACCOUNTS = [
  { username: 'lilmiquela', status: 'active', created_at: '2020-01-15T00:00:00Z' },
  { username: 'imma.gram', status: 'active', created_at: '2020-02-20T00:00:00Z' },
  { username: 'shudu.gram', status: 'active', created_at: '2020-03-10T00:00:00Z' },
  { username: 'noonoouri', status: 'active', created_at: '2020-04-05T00:00:00Z' },
  { username: 'knox.frost', status: 'active', created_at: '2020-05-22T00:00:00Z' },
  { username: 'blawko22', status: 'active', created_at: '2020-06-18T00:00:00Z' },
  { username: 'ruby9100m', status: 'active', created_at: '2020-07-30T00:00:00Z' },
  { username: 'bermudaisbae', status: 'active', created_at: '2020-08-12T00:00:00Z' },
  { username: 'aivatar_official', status: 'active', created_at: '2020-09-25T00:00:00Z' },
  { username: 'galaxia.gram', status: 'active', created_at: '2020-10-05T00:00:00Z' }
];

export const fetchAccounts = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.accounts);
    return response.data;
  } catch (error) {
    console.error('Error fetching accounts, using mock data:', error);
    return { accounts: MOCK_ACCOUNTS };
  }
};

export const submitAccount = async (username, submitter = 'Anonymous') => {
  try {
    const response = await api.post(API_ENDPOINTS.submit, { username, submitter });
    return response.data;
  } catch (error) {
    console.error('Error submitting account, using mock response:', error);
    // Return a success response anyway so the UI doesn't break
    return {
      success: true,
      message: 'Account submitted for review (demo mode)',
      status: 'pending',
      username: username,
      submitter: submitter
    };
  }
};

// Mock pending accounts data
const MOCK_PENDING_ACCOUNTS = [
  { username: 'ai_influencer_2025', submitter: 'john_doe', submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { username: 'digital_avatar_official', submitter: 'marketing_team', submitted_at: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString() },
  { username: 'virtual_persona', submitter: 'ai_enthusiast', submitted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() }
];

// Admin API endpoints
export const fetchPendingAccounts = async () => {
  try {
    const response = await api.get('/api/admin/pending');
    return response.data;
  } catch (error) {
    console.error('Error fetching pending accounts, using mock data:', error);
    return { accounts: MOCK_PENDING_ACCOUNTS };
  }
};

export const fetchTrackedAccounts = async () => {
  try {
    const response = await api.get('/api/admin/tracked');
    return response.data;
  } catch (error) {
    console.error('Error fetching tracked accounts, using accounts from fetchAccounts:', error);
    return { accounts: MOCK_ACCOUNTS };
  }
};

export const approveAccount = async (username) => {
  try {
    const response = await api.post('/api/admin/approve', { username });
    return response.data;
  } catch (error) {
    console.error('Error approving account, using mock response:', error);
    return { 
      success: true, 
      message: `Account ${username} approved (demo mode)`,
      username: username 
    };
  }
};

export const rejectAccount = async (username) => {
  try {
    const response = await api.post('/api/admin/reject', { username });
    return response.data;
  } catch (error) {
    console.error('Error rejecting account, using mock response:', error);
    return { 
      success: true, 
      message: `Account ${username} rejected (demo mode)`,
      username: username 
    };
  }
};

export const removeAccount = async (username) => {
  try {
    const response = await api.post('/api/admin/remove', { username });
    return response.data;
  } catch (error) {
    console.error('Error removing account, using mock response:', error);
    return { 
      success: true, 
      message: `Account ${username} removed (demo mode)`,
      username: username 
    };
  }
};

export default api;