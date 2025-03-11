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

// Helper function to format scraper data to our expected format
const formatScraperData = (scraperProfiles) => {
  // Format the data to match our expected structure
  // The scraper service returns an array of profiles directly
  const formattedData = {
    leaderboard: scraperProfiles.map((profile, index) => ({
      username: profile.username,
      bio: profile.biography || '',
      follower_count: profile.follower_count,
      profile_img_url: profile.profile_pic_url,
      follower_change: 0, // No change data available from scraper directly
      rank: index + 1
    })),
    updated_at: new Date().toISOString()
  };
  
  console.log(`Successfully formatted ${formattedData.leaderboard.length} profiles from scraper service`);
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
      
      // Try through our Nginx proxy first (avoids CORS issues)
      console.log('Trying scraper service through local proxy at /scraper/profiles');
      
      try {
        const proxyResponse = await axios.get('/scraper/profiles');
        if (Array.isArray(proxyResponse.data)) {
          console.log(`Successfully received ${proxyResponse.data.length} profiles through proxy`);
          return formatScraperData(proxyResponse.data);
        }
      } catch (proxyError) {
        console.log('Proxy attempt failed, trying direct connection', proxyError);
      }
      
      // If proxy fails, try direct connection as last resort
      try {
        const scraperUrl = process.env.REACT_APP_SCRAPER_URL || 
                          (window._env_ && window._env_.REACT_APP_SCRAPER_URL) || 
                          'https://scraper-service-907s.onrender.com';
                          
        console.log(`Trying scraper service directly at ${scraperUrl}/profiles`);
        const scraperResponse = await axios.get(`${scraperUrl}/profiles`);
        
        if (Array.isArray(scraperResponse.data)) {
          return formatScraperData(scraperResponse.data);
        }
      } catch (directError) {
        console.log('Direct connection failed, using mock data', directError);
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