import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Paper,
  Button,
  Divider,
  Grid,
  Chip,
  Tooltip,
  IconButton,
  Link,
  Pagination,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportIcon from '@mui/icons-material/BugReport';
import { fetchLeaderboard, fetchTrends } from '../services/api';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';
import ProfileCard from '../components/ProfileCard';

const Leaderboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [profilesPerPage] = useState(10); // Show 10 profiles per page
  
  // Manual API testing state
  const [directData, setDirectData] = useState(null);
  const [directLoading, setDirectLoading] = useState(false);
  const [directError, setDirectError] = useState(null);
  const [showDirect, setShowDirect] = useState(false);
  
  // Access theme for consistent spacing
  const theme = useTheme();
  
  // Reset to page 1 when search term changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);
  
  // Direct fetch function that bypasses the API client
  const directFetchLeaderboard = async () => {
    try {
      console.log('Executing direct fetch to backend API');
      
      // Get API URL from config/env variables
      const apiUrl = process.env.REACT_APP_API_URL || 
                    (window._env_ && window._env_.REACT_APP_API_URL) || 
                    '/api/leaderboard';
                    
      // Use relative path if no API URL is configured 
      const endpoint = apiUrl.includes('://') ? 
                      `${apiUrl}/api/leaderboard` : 
                      '/api/leaderboard';
                      
      console.log(`Using API endpoint: ${endpoint}`);
      
      // Direct call to the backend API
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        // Longer timeout for slow connections
        signal: AbortSignal.timeout(30000)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      // Parse response as JSON
      const data = await response.json();
      console.log('Direct fetch successful:', data);
      return data;
    } catch (error) {
      console.error('Direct fetch error:', error);
      throw error;
    }
  };

  // Fetch leaderboard data using the API client (now with fallback mechanisms)
  const { data, isLoading, isError, error, refetch } = useQuery(
    'leaderboard',
    fetchLeaderboard,  // Using the fetchLeaderboard function from api.js
    { 
      staleTime: 15 * 1000, // 15 seconds
      refetchInterval: 20 * 1000, // Auto-refresh every 20 seconds
      refetchIntervalInBackground: true, // Refresh even when tab is not active
      retry: 3,  // Increased to 3 retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      onError: (err) => console.error("Query error:", err),
      onSuccess: (data) => {
        console.log("Leaderboard data received:", data);
        if (data && data.leaderboard) {
          // Log follower change values for debugging
          console.log("LEADERBOARD DATA RECEIVED FROM API:");
          data.leaderboard.forEach(profile => {
            console.log(`${profile.username}: follower_count=${profile.follower_count}, follower_change=${profile.follower_change}, type=${typeof profile.follower_change}`);
          });
        }
      }
    }
  );
  
  // State for refresh and scrape operations
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState(null);
  
  // Enhanced refetch function with visual indicator
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Use forceRefresh parameter to get fresh data
    try {
      const freshData = await fetchLeaderboard(true);
      await fetchTrends(true);
      // Force a refetch of the leaderboard data in react-query
      await refetch();
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
    
    // Show refreshing indicator for at least 500ms for better UX
    setTimeout(() => setIsRefreshing(false), 500);
  };
  
  // Function to trigger a new scrape operation
  const triggerScrape = async () => {
    setIsScraping(true);
    setScrapeResult(null);
    
    try {
      // Call the scrape endpoint to trigger data collection
      const response = await axios.post(API_ENDPOINTS.scrape);
      
      // Set the result for display
      setScrapeResult({
        success: response.data.success,
        message: response.data.message || "Scrape operation completed.",
        timestamp: new Date().toISOString()
      });
      
      console.log("Scrape operation triggered:", response.data);
      
      // Wait 5 seconds for the scrape to collect new data, then refresh
      setTimeout(async () => {
        console.log("Refreshing data after scrape...");
        await handleRefresh();
      }, 5000);
      
    } catch (error) {
      console.error("Error triggering scrape:", error);
      setScrapeResult({
        success: false,
        message: error.response?.data?.message || error.message || "Unknown error",
        timestamp: new Date().toISOString()
      });
    } finally {
      // Keep the scraping indicator active for at least 1 second
      setTimeout(() => setIsScraping(false), 1000);
    }
  };
  
  // Function to test the API directly using basic fetch
  const testDirectAPI = async () => {
    setDirectLoading(true);
    setDirectError(null);
    setDirectData(null);
    
    try {
      // Get API URL from config/env variables
      const apiUrl = process.env.REACT_APP_API_URL || 
                    (window._env_ && window._env_.REACT_APP_API_URL) || 
                    '';
      
      // Try different approaches to reach the API
      const approaches = [
        { name: 'React proxy', url: '/api/leaderboard' },
        { name: 'API direct', url: `${apiUrl}/api/leaderboard` },
        { name: 'Minimal test', url: '/api/test' },
        { name: 'Scraper service', url: 'https://scraper-service-907s.onrender.com/profiles' }
      ];
      
      let successful = false;
      
      // Try each approach until one works
      for (const approach of approaches) {
        if (successful) break;
        
        try {
          console.log(`Testing API using ${approach.name}: ${approach.url}`);
          
          // Use basic fetch for maximum compatibility
          const response = await fetch(approach.url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            // Short timeout to quickly move to next approach if this fails
            signal: AbortSignal.timeout(10000)
          });
          
          if (!response.ok) {
            throw new Error(`Error: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log(`${approach.name} successful:`, data);
          setDirectData({
            method: approach.name,
            url: approach.url,
            data: data
          });
          successful = true;
          
        } catch (approachError) {
          console.error(`${approach.name} failed:`, approachError);
        }
      }
      
      if (!successful) {
        throw new Error('All API connection approaches failed');
      }
      
    } catch (err) {
      console.error('All API tests failed:', err);
      setDirectError(err);
    } finally {
      setDirectLoading(false);
    }
  };
  
  // Format the date and time
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'Unknown';
    
    const date = new Date(dateTimeString);
    return date.toLocaleString();
  };
  
  // Filter leaderboard data based on search term
  const filteredLeaderboard = data?.leaderboard.filter(profile => 
    profile.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (profile.bio && profile.bio.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredLeaderboard.length / profilesPerPage);
  const currentProfiles = filteredLeaderboard.slice(
    (page - 1) * profilesPerPage, 
    page * profilesPerPage
  );
  
  // Handle page change
  const handlePageChange = (event, value) => {
    setPage(value);
    // Scroll to top when changing pages
    window.scrollTo(0, 0);
  };
  
  return (
    <Box sx={{ 
      px: 0,                        // No horizontal padding
      width: '100%',                // Full width container
      position: 'relative',         // For positioning reference
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, px: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          AI Instagram Leaderboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Get fresh data from API">
            <IconButton 
              onClick={handleRefresh} 
              disabled={isLoading || isRefreshing || isScraping}
              color={isRefreshing ? "primary" : "default"}
            >
              {isRefreshing ? (
                <CircularProgress size={24} color="primary" />
              ) : (
                <RefreshIcon />
              )}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Trigger new data collection from Instagram">
            <span>
              <Button 
                variant="contained" 
                color="secondary" 
                onClick={triggerScrape}
                disabled={isScraping || isRefreshing}
                size="small"
                sx={{ 
                  textTransform: 'none',
                  minWidth: '120px'
                }}
              >
                {isScraping ? (
                  <>
                    <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                    Scraping...
                  </>
                ) : (
                  "Collect New Data"
                )}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Scrape result notification */}
      {scrapeResult && (
        <Alert 
          severity={scrapeResult.success ? "success" : "error"} 
          sx={{ mb: 3, mx: 2 }}
          onClose={() => setScrapeResult(null)}
        >
          <Typography variant="subtitle2">
            {scrapeResult.success ? "Data Collection Status:" : "Error Collecting Data:"}
          </Typography>
          <Typography variant="body2">
            {scrapeResult.message}
          </Typography>
          {scrapeResult.success && (
            <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 1 }}>
              The new data will be available in a few moments. The page will refresh automatically.
            </Typography>
          )}
        </Alert>
      )}
      
      <Paper elevation={0} sx={{ p: 3, mb: 4, mx: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
        {/* Completely separate the search and refresh components */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Search row - full width on its own row */}
          <Box>
            <TextField
              placeholder="Search by username or bio"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              variant="outlined"
              size="small"
              sx={{ width: '480px', maxWidth: '90%' }}
            />
          </Box>
          
          {/* Status chips on their own row */}
          {data && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Tooltip title="Auto-refreshes every 20 seconds">
                <Chip 
                  icon={<RefreshIcon fontSize="small" />}
                  label="Auto-refresh ON" 
                  color="success"
                  size="small"
                />
              </Tooltip>
              <Tooltip title="Last updated">
                <Chip 
                  label={`Updated: ${formatDateTime(data.updated_at)}`} 
                  variant="outlined" 
                  size="small"
                />
              </Tooltip>
            </Box>
          )}
        </Box>
      </Paper>
      
      {/* API Debug Controls */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, mx: 2, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <Button 
          variant="outlined" 
          color="secondary" 
          startIcon={<BugReportIcon />}
          onClick={() => {
            setShowDirect(!showDirect);
            if (!directData && !directError) {
              testDirectAPI();
            }
          }}
          size="small"
        >
          {showDirect ? "Hide Debug" : "Debug API"}
        </Button>
        
        <Button 
          variant="outlined"
          color="primary"
          component={Link}
          href="/api-test"
          target="_blank"
          size="small"
          sx={{ ml: 1 }}
        >
          API Test Page
        </Button>
      </Paper>
      
      {/* API Debug Info */}
      {showDirect && (
        <Paper elevation={0} sx={{ p: 3, mb: 3, mx: 2, bgcolor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom>API Debug Information</Typography>
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={testDirectAPI}
            disabled={directLoading}
            sx={{ mb: 2 }}
          >
            {directLoading ? <CircularProgress size={24} /> : 'Test API Directly'}
          </Button>
          
          {directError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>API Error:</Typography>
              <pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                {directError.toString()}
              </pre>
              {directError.response && (
                <>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>Response:</Typography>
                  <pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                    Status: {directError.response.status} {directError.response.statusText}
                    {directError.response.data && `\nData: ${JSON.stringify(directError.response.data, null, 2)}`}
                  </pre>
                </>
              )}
            </Alert>
          )}
          
          {directData && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>API Response:</Typography>
              <pre style={{ 
                whiteSpace: 'pre-wrap', 
                overflowX: 'auto',
                bgcolor: '#ffffff',
                p: 2,
                borderRadius: 1
              }}>
                {JSON.stringify(directData, null, 2)}
              </pre>
            </Box>
          )}
        </Paper>
      )}
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4, mx: 2 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Alert severity="error" sx={{ mb: 2, mx: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Error loading leaderboard:
          </Typography>
          <Typography>
            {error?.message || 'Unknown error'}
          </Typography>
          {error?.response && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Response Details:</Typography>
              <pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                Status: {error.response.status} {error.response.statusText}
                {error.response.data && `\nData: ${JSON.stringify(error.response.data, null, 2)}`}
              </pre>
            </Box>
          )}
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" color="primary" onClick={handleRefresh}>
              Retry
            </Button>
            <Button variant="outlined" sx={{ ml: 1 }} onClick={() => window.location.reload()}>
              Reload Page
            </Button>
            <Button 
              variant="outlined" 
              color="secondary" 
              sx={{ ml: 1 }} 
              onClick={() => window.open('/direct-leaderboard.html', '_blank')}
            >
              Fallback Leaderboard
            </Button>
          </Box>
          
          <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
            If the error persists, try the standalone leaderboard at{' '}
            <a href="/direct-leaderboard.html" target="_blank" rel="noopener noreferrer">
              /direct-leaderboard.html
            </a>
          </Typography>
        </Alert>
      ) : (
        <>
          {!data || !data.leaderboard || data.leaderboard.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2, mx: 2 }}>
              No profile data available. The API returned an empty leaderboard.
            </Alert>
          ) : filteredLeaderboard.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2, mx: 2 }}>
              No profiles found matching your search criteria.
            </Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mx: 2 }}>
                Showing {currentProfiles.length} of {filteredLeaderboard.length} accounts
                {searchTerm && ` matching "${searchTerm}"`}
                {totalPages > 1 && ` (Page ${page} of ${totalPages})`}
              </Typography>
              
              <Box sx={{ 
                width: '100%',               // Full width
                m: 0,                        // No margin
                p: 0,                        // No padding
              }}>
                {currentProfiles.map((profile) => (
                  <ProfileCard 
                    key={profile.username} 
                    profile={profile} 
                    rank={profile.rank}
                  />
                ))}
                
                {/* Pagination controls */}
                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <Pagination 
                      count={totalPages} 
                      page={page} 
                      onChange={handlePageChange}
                      color="primary"
                      size="large"
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </Box>
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default Leaderboard;