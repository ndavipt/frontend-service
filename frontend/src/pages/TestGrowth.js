import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert, 
  Button,
  Container,
  Grid,
  Paper,
  Divider
} from '@mui/material';
import { useQuery, useQueryClient } from 'react-query';
import ProfileCard from '../components/ProfileCard';
import { fetchTestData, fetchTestTrends } from '../services/api';

const TestGrowth = () => {
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  
  // Fetch test profile data
  const { 
    data: profileData, 
    isLoading: profilesLoading, 
    error: profilesError 
  } = useQuery('test-profiles', fetchTestData);
  
  // Fetch test trends data
  const { 
    data: trendsData, 
    isLoading: trendsLoading, 
    error: trendsError 
  } = useQuery('test-trends', fetchTestTrends);
  
  // When trends data loads, set it in the 'trends' query to make it available to ProfileCard
  useEffect(() => {
    if (trendsData) {
      queryClient.setQueryData('trends', trendsData);
    }
  }, [trendsData, queryClient]);
  
  // Calculate combined loading state
  useEffect(() => {
    setLoading(profilesLoading || trendsLoading);
  }, [profilesLoading, trendsLoading]);
  
  // Handle refetching of data
  const handleRefreshData = () => {
    queryClient.invalidateQueries('test-profiles');
    queryClient.invalidateQueries('test-trends');
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
          Follower Growth Logic Test Page
        </Typography>
        
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            About This Test Page
          </Typography>
          <Typography variant="body1" paragraph>
            This page demonstrates the follower growth logic using synthetic test data with different growth patterns.
            The profiles below showcase different growth scenarios to verify that the growth calculation logic works correctly.
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Test Cases:</Typography>
              <ul>
                <li>Steady Growth (+500, +5%)</li>
                <li>Negative Growth (-300, -1.5%)</li>
                <li>Zero Growth (0, 0%)</li>
                <li>Rapid Growth (+1000, +20%)</li>
                <li>Missing Growth Data (calculated from trends)</li>
              </ul>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Growth Logic Methods:</Typography>
              <ul>
                <li>Direct API Value (profile.follower_change)</li>
                <li>Calculated from trends (most recent points)</li>
                <li>12-Hour Growth (from hourly data points)</li>
              </ul>
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              onClick={handleRefreshData}
              disabled={loading}
            >
              Refresh Test Data
            </Button>
          </Box>
        </Paper>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : profilesError || trendsError ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            Error loading test data: {profilesError?.message || trendsError?.message}
          </Alert>
        ) : (
          <>
            <Typography variant="h5" sx={{ mb: 2, mt: 4 }}>
              Test Profiles with Growth Data
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            {profileData && profileData.leaderboard ? (
              profileData.leaderboard.map((profile, index) => (
                <ProfileCard 
                  key={profile.username} 
                  profile={profile} 
                  rank={index + 1} 
                />
              ))
            ) : (
              <Alert severity="warning">No test profiles available</Alert>
            )}
            
            <Box sx={{ mt: 4, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Test data refreshed at: {profileData?.updated_at || new Date().toISOString()}
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Container>
  );
};

export default TestGrowth;