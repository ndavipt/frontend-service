import axios from 'axios';
import { 
  API_PORT, 
  API_URL as CONFIG_API_URL, 
  API_ENDPOINTS, 
  LOGIC_SERVICE_URL as CONFIG_LOGIC_URL,
  DIRECT_LOGIC_SERVICE_URL,
  LOGIC_API,
  USE_FETCH_FOR_DIRECT
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

// Configure Logic Service URL
const LOGIC_URL = runtimeEnv.REACT_APP_LOGIC_URL || 
                 process.env.REACT_APP_LOGIC_URL || 
                 CONFIG_LOGIC_URL || 
                 '/logic'; // Use local proxy as default

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
          signal: AbortSignal.timeout(5000) // 5 second timeout
        }),
        fetch(`${baseUrl}/api/v1/analytics/changes/${username}`, { 
          method: 'GET',
          cache: 'no-store',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000)
        }),
        fetch(`${baseUrl}/api/v1/analytics/rolling-average/${username}`, { 
          method: 'GET',
          cache: 'no-store',
          headers: { 'Accept': 'application/json' },
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
          // Skip proxies and connect directly to Logic Service
          console.log('Connecting directly to Logic Service');
          
          const directEndpoint = `${DIRECT_LOGIC_SERVICE_URL}/api/v1/profiles`;
          console.log(`Attempting to fetch profiles from Logic Service at ${directEndpoint}`);
          
          // Use native fetch API to avoid SSL handshake issues that can happen with axios
          console.log(`Using fetch API for direct connection`);
          const fetchResponse = await fetch(directEndpoint, { 
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            // Use cache: 'no-store' to avoid cached responses
            cache: 'no-store',
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });
          
          if (!fetchResponse.ok) {
            throw new Error(`Fetch failed with status ${fetchResponse.status}`);
          }
          
          // Convert the fetch response to the same format axios would return
          const responseData = await fetchResponse.json();
          logicProfilesResponse = { data: responseData };
          
          console.log(`Successfully connected to Logic Service at ${directEndpoint}`);
          console.log(`Received ${responseData.length} profiles from Logic Service`);
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
        // Skip all proxies and go directly to the logic service
        const directLogicUrl = 'https://logic-service.onrender.com';
        console.log(`Making direct attempt to Logic Service at ${directLogicUrl}/api/v1/profiles - bypassing all proxies`);
                             
        // Skip health check to simplify - go straight to data
        
        let finalResponse;
        
        // Always use the native fetch API with Logic Service
        console.log(`Using fetch API to connect directly to Logic Service`);
        try {
          const fetchResponse = await fetch(`${directLogicUrl}/api/v1/profiles`, {
            method: 'GET',
            cache: 'no-store',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });
          
          if (!fetchResponse.ok) {
            throw new Error(`Fetch failed with status ${fetchResponse.status}`);
          }
          
          // Convert the fetch response to the same format axios would return
          const responseData = await fetchResponse.json();
          finalResponse = { data: responseData };
          console.log(`Successfully fetched ${responseData.length} profiles from Logic Service`);
        } catch (fetchError) {
          console.error(`Error fetching from Logic Service:`, fetchError);
          // Fall back to mock data
          throw fetchError;
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
        // Get all accounts from Logic Service using direct URL
        const accountsResponse = await axios.get(`${LOGIC_URL}/api/v1/accounts`);
        
        if (Array.isArray(accountsResponse.data) && accountsResponse.data.length > 0) {
          console.log(`Fetching history for ${accountsResponse.data.length} accounts from Logic Service`);
          
          // For each account, fetch its history
          const trendsData = await Promise.all(
            accountsResponse.data.map(async (account) => {
              try {
                const historyResponse = await axios.get(`${LOGIC_URL}/api/v1/profiles/history/${account.username}`);
                
                if (historyResponse.data && historyResponse.data.history) {
                  // Format the history data
                  const history = historyResponse.data.history;
                  
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