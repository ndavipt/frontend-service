import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Tooltip,
  Link,
  Avatar,
  Grid,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import InstagramIcon from '@mui/icons-material/Instagram';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { useQuery } from 'react-query';
import { fetchTrends } from '../services/api';
import { getAvatarUrl, getProfileImageUrl } from '../config';

// Custom Avatar component with lazy loading
const InstagramAvatar = ({ src, alt, imgError, onError, sx }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const avatarRef = React.useRef(null);
  
  // Set up intersection observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '200px' }); // Start loading when within 200px of viewport
    
    if (avatarRef.current) {
      observer.observe(avatarRef.current);
    }
    
    return () => {
      if (avatarRef.current) {
        observer.unobserve(avatarRef.current);
      }
    };
  }, []);
  
  // Handle direct errors in the component
  const handleLocalError = (e) => {
    console.log(`Avatar component load failed for ${alt}`);
    setLoadFailed(true);
    // Also call parent handler if provided
    if (onError) {
      onError(e);
    }
  };
  
  // If image has already errored or load failed, show a placeholder
  if (imgError || loadFailed) {
    // Use a nice gradient colored avatar with the first two letters
    const initials = alt ? alt.substring(0, 2).toUpperCase() : 'AI';
    const avatarUrl = getAvatarUrl(initials);
    
    return (
      <Avatar 
        src={avatarUrl}
        alt={alt}
        sx={{
          ...sx,
          border: '2px solid #E1306C', // Instagram-colored border
          bgcolor: '#E1306C',          // Instagram brand color
          color: 'white',              // White text color for initials
          fontWeight: 'bold'           // Bold text
        }}
        ref={avatarRef}
      />
    );
  }
  
  // Otherwise, try to load the actual image
  return (
    <Avatar 
      src={isVisible ? src : `https://via.placeholder.com/150?text=Loading...`}
      alt={alt}
      onError={handleLocalError}
      sx={{
        ...sx,
        border: '2px solid #E1306C',  // Instagram brand color border
      }}
      ref={avatarRef}
    />
  );
};

// Helper to format numbers
const formatNumber = (num) => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  } else {
    return num.toString();
  }
};

const ProfileCard = ({ profile, rank, showRank = true }) => {
  const theme = useTheme();
  const [imgError, setImgError] = useState(false);
  
  // Fetch trends data to calculate follower changes
  const { data: trendsData } = useQuery('trends', fetchTrends, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
  
  // Function to get the profile image URL - uses the config utility function
  const getProfileImage = () => {
    return getProfileImageUrl(profile.profile_img_url, profile.username);
  };
  
  // Function to get a colorful avatar with initials for fallback
  const getProfileColor = (username) => {
    // Predefined colors based on rank or username
    const rankColors = {
      1: '#FFD700', // Gold for rank 1
      2: '#C0C0C0', // Silver for rank 2 
      3: '#CD7F32', // Bronze for rank 3
    };
    
    // Instagram pink for normal profiles
    const defaultColor = '#E1306C';
    
    // Use rank color if available, otherwise default
    return profile.rank && profile.rank <= 3 ? rankColors[profile.rank] : defaultColor;
  };
  
  // Simplified image error handling
  const handleImageError = () => {
    // Set the error flag to use the default Avatar fallback
    setImgError(true);
    
    // Log detailed error for debugging
    console.error(`Image failed to load for ${profile.username}`, {
      profileImgUrl: profile.profile_img_url,
      resolvedUrl: getProfileImage()
    });
    
    // Try to prefetch the fallback avatar to ensure it loads
    const avatarUrl = getAvatarUrl(profile.username?.substring(0, 2).toUpperCase() || 'AI');
    const img = new Image();
    img.src = avatarUrl;
  };
  
  // Get rank badge color
  const getRankColor = (rank) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return theme.palette.primary.main;
  };
  
  // Calculate follower change
  const getFollowerChange = () => {
    // First check if profile has follower_change field directly from API
    if (profile.follower_change !== undefined && profile.follower_change !== null) {
      return {
        value: profile.follower_change,
        percentage: profile.follower_count > 0 ? (profile.follower_change / profile.follower_count) * 100 : 0
      };
    }
    
    // Fall back to calculating from trends data if needed
    if (!trendsData || !trendsData.trends) return null;
    
    const accountTrend = trendsData.trends.find(
      trend => trend.username === profile.username
    );
    
    if (!accountTrend) return null;
    
    // Check if we have the new data structure (follower_counts array) or the old one (data_points)
    if (accountTrend.follower_counts && accountTrend.follower_counts.length >= 2) {
      // Get the two most recent follower counts
      const latest = accountTrend.follower_counts[accountTrend.follower_counts.length - 1];
      const previous = accountTrend.follower_counts[accountTrend.follower_counts.length - 2];
      
      const change = latest - previous;
      
      return {
        value: change,
        percentage: previous > 0 ? (change / previous) * 100 : 0
      };
    } 
    // Fall back to old data structure if present
    else if (accountTrend.data_points && accountTrend.data_points.length >= 2) {
      // Get the two most recent data points
      const sortedPoints = [...accountTrend.data_points].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      
      if (sortedPoints.length < 2) return null;
      
      const latest = sortedPoints[0];
      const previous = sortedPoints[1];
      
      const change = latest.follower_count - previous.follower_count;
      
      return {
        value: change,
        percentage: (change / previous.follower_count) * 100
      };
    }
    
    return null; // Not enough data to calculate change
  };
  
  // Calculate 12-hour follower growth
  const get12HourGrowth = () => {
    // We need trends data to calculate this
    if (!trendsData || !trendsData.trends) return null;
    
    const accountTrend = trendsData.trends.find(
      trend => trend.username === profile.username
    );
    
    if (!accountTrend) return null;
    
    // Check if we have the new data structure (timestamps & follower_counts arrays)
    if (accountTrend.timestamps && accountTrend.follower_counts && 
        accountTrend.timestamps.length >= 2 && accountTrend.follower_counts.length >= 2) {
      
      // Get current time and time 12 hours ago
      const now = new Date();
      const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000); // 12 hours in milliseconds
      
      // Create pairs of timestamps and follower counts
      const dataPoints = accountTrend.timestamps.map((timestamp, index) => ({
        date: timestamp,
        follower_count: accountTrend.follower_counts[index]
      }));
      
      // Sort data points by date (newest first)
      const sortedPoints = [...dataPoints].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      
      // Get the latest data point
      const latest = sortedPoints[0];
      
      // Find the data point closest to 12 hours ago
      let referencePt = null;
      
      for (const point of sortedPoints) {
        const pointDate = new Date(point.date);
        
        // If this point is older than 12 hours ago, use it as reference
        if (pointDate <= twelveHoursAgo) {
          referencePt = point;
          break;
        }
      }
      
      // If we couldn't find a point older than 12 hours, try using the oldest available point
      if (!referencePt && sortedPoints.length >= 2) {
        referencePt = sortedPoints[sortedPoints.length - 1];
      }
      
      // If we still don't have a reference point, we can't calculate growth
      if (!referencePt) return null;
      
      const growth = latest.follower_count - referencePt.follower_count;
      
      // Calculate hourly rate based on the time difference
      const latestDate = new Date(latest.date);
      const referenceDate = new Date(referencePt.date);
      const hoursDiff = Math.max(1, (latestDate - referenceDate) / (1000 * 60 * 60)); // In hours
      
      return {
        value: growth,
        percentage: (growth / referencePt.follower_count) * 100,
        hourlyRate: growth / hoursDiff,
        hoursPassed: hoursDiff
      };
    }
    // Fall back to the old data structure
    else if (accountTrend.data_points && accountTrend.data_points.length >= 2) {
      // Sort data points by date (newest first)
      const sortedPoints = [...accountTrend.data_points].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      
      // Get current time and time 12 hours ago
      const now = new Date();
      const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000); // 12 hours in milliseconds
      
      // Get the latest data point
      const latest = sortedPoints[0];
      
      // Find the data point closest to 12 hours ago
      let referencePt = null;
      
      for (const point of sortedPoints) {
        const pointDate = new Date(point.date);
        
        // If this point is older than 12 hours ago, use it as reference
        if (pointDate <= twelveHoursAgo) {
          referencePt = point;
          break;
        }
      }
      
      // If we couldn't find a point older than 12 hours, try using the oldest available point
      if (!referencePt && sortedPoints.length >= 2) {
        referencePt = sortedPoints[sortedPoints.length - 1];
      }
      
      // If we still don't have a reference point, we can't calculate growth
      if (!referencePt) return null;
      
      const growth = latest.follower_count - referencePt.follower_count;
      
      // Calculate hourly rate based on the time difference
      const latestDate = new Date(latest.date);
      const referenceDate = new Date(referencePt.date);
      const hoursDiff = Math.max(1, (latestDate - referenceDate) / (1000 * 60 * 60)); // In hours
      
      return {
        value: growth,
        percentage: (growth / referencePt.follower_count) * 100,
        hourlyRate: growth / hoursDiff,
        hoursPassed: hoursDiff
      };
    }
    
    return null; // Not enough data points
  };
  
  // Get follower change data from the API (direct from profile.follower_change)
  let followerChange = null;
  
  // IMPORTANT: Always use the direct value from the API if available
  if (profile.follower_change !== undefined && profile.follower_change !== null) {
    // Ensure follower_change is converted to a number for proper comparison
    const changeValue = Number(profile.follower_change);
    followerChange = {
      value: changeValue,
      percentage: profile.follower_count > 0 ? (changeValue / profile.follower_count) * 100 : 0
    };
    console.log(`DEBUG: Using follower_change=${changeValue} for ${profile.username}`);
  } 
  // Fallback to calculated value from trends if needed
  else {
    // Try to calculate from trend data if available
    const calculatedChange = getFollowerChange();
    if (calculatedChange) {
      followerChange = calculatedChange;
      console.log(`DEBUG: Using calculated follower_change=${calculatedChange.value} for ${profile.username}`);
    }
    // Last resort - set to zero for new accounts with no history
    else {
      followerChange = {
        value: 0,
        percentage: 0
      };
      console.log(`DEBUG: No follower change data available for ${profile.username}, using zero`);
    }
  }
  
  // Get 12-hour growth data
  let twelveHourGrowth = get12HourGrowth();
  
  // If we don't have real 12-hour growth data, use reasonable defaults
  if (!twelveHourGrowth) {
    // For 12-hour growth, use the same value as the follower change if available
    // This is not perfect but it's real data rather than fabricated data
    
    let value = followerChange?.value || 0;
    const hourlyRate = value / 12;
    
    twelveHourGrowth = {
      value: value,
      percentage: profile.follower_count > 0 ? (value / profile.follower_count) * 100 : 0,
      hourlyRate: hourlyRate,
      hoursPassed: 12
    };
    console.log(`No 12-hour growth data for ${profile.username}, using simple follower change: ${value}`);
  }
  
  // Determine change icon and color
  const getChangeIcon = (change) => {
    if (!change) return null;
    
    // Convert to number to ensure proper comparison
    const value = Number(change.value);
    
    if (value > 0) {
      return <TrendingUpIcon fontSize="small" sx={{ color: 'success.main' }} />;
    } else if (value < 0) {
      return <TrendingDownIcon fontSize="small" sx={{ color: 'error.main' }} />;
    } else {
      return <TrendingFlatIcon fontSize="small" sx={{ color: 'text.secondary' }} />;
    }
  };
  
  // Format the change text
  const formatChange = (change) => {
    if (!change) return null;
    
    // Convert to number to ensure proper formatting
    const value = Number(change.value);
    const absChange = Math.abs(value);
    const sign = value >= 0 ? '+' : '-';
    
    return `${sign}${formatNumber(absChange)}`;
  };
  
  return (
    <Card 
      sx={{ 
        mb: 3,
        overflow: 'visible',
        position: 'relative',
        borderRadius: '8px',          // Normal border radius
        boxShadow: 3,                 
        mx: 2,                        // Regular margin
        width: 'auto',                // Auto width
        borderLeft: `6px solid ${theme.palette.primary.main}`, // Left accent border
      }}
    >
      {showRank && (
        <Tooltip title={`Rank #${rank}`}>
          <Chip
            label={`#${rank}`}
            sx={{
              position: 'absolute',
              top: -10,
              left: -10,
              fontWeight: 'bold',
              bgcolor: getRankColor(rank),
              color: 'white',
              zIndex: 1,
              height: 32,
              fontSize: '1rem',
            }}
          />
        </Tooltip>
      )}
      
      {/* Separate layout for mobile vs. desktop */}
      {/* MOBILE LAYOUT */}
      <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
        <Box sx={{ position: 'relative', pt: 2, px: 2 }}>
          {/* Header with username and follower change on same row */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2" sx={{ 
              fontWeight: 'bold', 
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}>
              @{profile.username}
              <Tooltip title="View on Instagram">
                <Link 
                  href={`https://instagram.com/${profile.username}`} 
                  target="_blank" 
                  rel="noopener"
                  sx={{ color: theme.palette.primary.main, ml: 0.5 }}
                >
                  <InstagramIcon fontSize="small" />
                </Link>
              </Tooltip>
            </Typography>
            
            {/* MOBILE FOLLOWER CHANGE CHIPS */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
              {/* Since last scrape chip */}
              {followerChange && (
                <Tooltip title={`Change since last scrape: ${formatChange(followerChange)} (${followerChange.percentage.toFixed(2)}%)`}>
                  <Chip
                    icon={getChangeIcon(followerChange)}
                    label={formatChange(followerChange)}
                    color={followerChange.value > 0 ? 'success' : followerChange.value < 0 ? 'error' : 'default'}
                    variant="outlined"
                    size="small"
                    sx={{ 
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      height: '24px',
                      '& .MuiChip-icon': {
                        fontSize: '1rem',
                      },
                      border: '1px solid',
                      borderColor: followerChange.value > 0 ? 'success.main' : 
                                  followerChange.value < 0 ? 'error.main' : 
                                  'grey.400',
                    }}
                  />
                </Tooltip>
              )}
              
              {/* 12-hour growth chip */}
              {twelveHourGrowth && (
                <Tooltip 
                  title={`12-hour growth: ${formatChange(twelveHourGrowth)} (${twelveHourGrowth.percentage.toFixed(2)}%) over ${twelveHourGrowth.hoursPassed.toFixed(1)} hours`}
                >
                  <Chip
                    icon={getChangeIcon(twelveHourGrowth)}
                    label={`12h: ${formatChange(twelveHourGrowth)}`}
                    color={twelveHourGrowth.value > 0 ? 'success' : twelveHourGrowth.value < 0 ? 'error' : 'default'}
                    variant="outlined"
                    size="small"
                    sx={{ 
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      height: '22px',
                      '& .MuiChip-icon': {
                        fontSize: '0.85rem',
                      },
                      border: '1px solid',
                      borderColor: twelveHourGrowth.value > 0 ? 'success.main' : 
                                  twelveHourGrowth.value < 0 ? 'error.main' : 
                                  'grey.400',
                    }}
                  />
                </Tooltip>
              )}
            </Box>
          </Box>
          
          {/* Profile info section */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              src={getProfileImage()}
              alt={profile.username}
              onError={handleImageError}
              sx={{
                width: 80,
                height: 80,
                mr: 2,
                border: `3px solid ${theme.palette.primary.main}`,
                boxShadow: 2,
                fontSize: '2rem',
              }}
            />
            
            <Chip 
              icon={<PeopleIcon />}
              label={`${formatNumber(profile.follower_count)} followers`}
              color="primary"
              sx={{ fontWeight: 'bold' }}
            />
          </Box>
          
          {/* Bio section */}
          <Typography variant="body2" sx={{ 
            lineHeight: 1.5, 
            mb: 2,
            px: 1
          }}>
            {profile.bio || 'No bio available'}
          </Typography>
        </Box>
      </Box>
      
      {/* DESKTOP LAYOUT */}
      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
        <Grid container spacing={0}>
          <Grid item sm={3} md={2}>
            <Box sx={{ 
              p: 3, 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              height: '100%',
              justifyContent: 'center',
              borderRight: `1px solid ${theme.palette.divider}`
            }}>
              <Avatar
                src={getProfileImage()}
                alt={profile.username}
                onError={handleImageError}
                sx={{
                  width: 120,
                  height: 120,
                  mb: 2,
                  border: `3px solid ${theme.palette.primary.main}`,
                  boxShadow: 2,
                  fontSize: '3rem',
                }}
              />
              
              <Typography variant="h6" component="h2" sx={{ 
                fontWeight: 'bold', 
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5
              }}>
                @{profile.username}
                <Tooltip title="View on Instagram">
                  <Link 
                    href={`https://instagram.com/${profile.username}`} 
                    target="_blank" 
                    rel="noopener"
                    sx={{ color: theme.palette.primary.main, ml: 0.5 }}
                  >
                    <InstagramIcon fontSize="small" />
                  </Link>
                </Tooltip>
              </Typography>
              
              <Chip 
                icon={<PeopleIcon />}
                label={`${formatNumber(profile.follower_count)} followers`}
                color="primary"
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
          </Grid>
          
          <Grid item sm={9} md={10}>
            <Box sx={{ position: 'relative', height: '100%' }}>
              {/* Desktop follower change chips */}
              <Box sx={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end', zIndex: 9999 }}>
                {/* Since last scrape chip */}
                {followerChange && (
                  <Tooltip title={`Change since last scrape: ${formatChange(followerChange)} (${followerChange.percentage.toFixed(2)}%)`}>
                    <Chip
                      icon={getChangeIcon(followerChange)}
                      label={formatChange(followerChange)}
                      color={followerChange.value > 0 ? 'success' : followerChange.value < 0 ? 'error' : 'default'}
                      variant="outlined"
                      sx={{ 
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        height: '32px',
                        '& .MuiChip-icon': {
                          fontSize: '1.2rem',
                          marginLeft: '8px'
                        },
                        boxShadow: 2,
                        border: '1px solid',
                        borderColor: followerChange.value > 0 ? 'success.main' : 
                                    followerChange.value < 0 ? 'error.main' : 
                                    'grey.400',
                      }}
                    />
                  </Tooltip>
                )}
                
                {/* 12-hour growth chip */}
                {twelveHourGrowth && (
                  <Tooltip 
                    title={`12-hour growth: ${formatChange(twelveHourGrowth)} (${twelveHourGrowth.percentage.toFixed(2)}%) over ${twelveHourGrowth.hoursPassed.toFixed(1)} hours`}
                  >
                    <Chip
                      icon={getChangeIcon(twelveHourGrowth)}
                      label={`12h: ${formatChange(twelveHourGrowth)}`}
                      color={twelveHourGrowth.value > 0 ? 'success' : twelveHourGrowth.value < 0 ? 'error' : 'default'}
                      variant="outlined"
                      size="small"
                      sx={{ 
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        height: '24px',
                        '& .MuiChip-icon': {
                          fontSize: '1rem',
                          marginLeft: '4px'
                        },
                        boxShadow: 1,
                        border: '1px solid',
                        borderColor: twelveHourGrowth.value > 0 ? 'success.main' : 
                                    twelveHourGrowth.value < 0 ? 'error.main' : 
                                    'grey.400',
                      }}
                    />
                  </Tooltip>
                )}
              </Box>
              <CardContent sx={{ p: 3, position: 'relative', minHeight: '140px' }}>
                <Typography variant="body1" sx={{ 
                  lineHeight: 1.7, 
                  whiteSpace: 'pre-line', 
                  maxHeight: 140,
                  overflow: 'auto',
                  px: 1
                }}>
                  {profile.bio || 'No bio available'}
                </Typography>
              </CardContent>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Card>
  );
};

export default ProfileCard;