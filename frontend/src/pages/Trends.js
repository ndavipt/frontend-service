import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Card,
  CardContent,
  Divider,
  Autocomplete,
  TextField,
  Chip,
  Button,
  IconButton,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { fetchTrends } from '../services/api';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

const Trends = () => {
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [searchValue, setSearchValue] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [timeframe, setTimeframe] = useState('all'); // Options: '6h', '12h', '1d', '1w', '1m', 'all'
  const MAX_ACCOUNTS = 5;
  
  // Fetch trend data
  const { data, isLoading, isError, error } = useQuery(
    'trends',
    fetchTrends,
    { staleTime: 5 * 60 * 1000 } // 5 minutes
  );
  
  // Set default top 5 accounts on initial load
  useEffect(() => {
    if (data && data.trends && selectedAccounts.length === 0) {
      const topAccounts = data.trends
        .sort((a, b) => {
          // Get the latest follower count for each account
          const aLatest = a.follower_counts && a.follower_counts.length > 0 
            ? a.follower_counts[a.follower_counts.length - 1] 
            : 0;
          const bLatest = b.follower_counts && b.follower_counts.length > 0 
            ? b.follower_counts[b.follower_counts.length - 1] 
            : 0;
          return bLatest - aLatest;
        })
        .slice(0, 5)
        .map(account => account.username);
      
      setSelectedAccounts(topAccounts);
    }
  }, [data]);
  
  // Handle adding an account
  const handleAddAccount = (username) => {
    if (!username || selectedAccounts.includes(username) || selectedAccounts.length >= MAX_ACCOUNTS) {
      return;
    }
    
    setSelectedAccounts([...selectedAccounts, username]);
    setSearchValue('');
    setInputValue('');
  };
  
  // Handle removing an account
  const handleRemoveAccount = (username) => {
    setSelectedAccounts(selectedAccounts.filter(name => name !== username));
  };
  
  // Clear all selected accounts
  const handleClearAll = () => {
    setSelectedAccounts([]);
  };
  
  // Handle timeframe change
  const handleTimeframeChange = (event, newTimeframe) => {
    if (newTimeframe !== null) {
      setTimeframe(newTimeframe);
    }
  };
  
  // Filter data points based on selected timeframe - this is no longer used directly
  // but is kept for reference and potential future use
  const filterDataPointsByTimeframe = (timestamps, values) => {
    if (timeframe === 'all' || !timestamps || timestamps.length === 0 || !values || values.length === 0) {
      return { timestamps, values };
    }
    
    const now = new Date();
    let cutoffDate;
    
    switch (timeframe) {
      case '6h':
        cutoffDate = new Date(now - 6 * 60 * 60 * 1000); // 6 hours ago
        break;
      case '12h':
        cutoffDate = new Date(now - 12 * 60 * 60 * 1000); // 12 hours ago
        break;
      case '1d':
        cutoffDate = new Date(now - 24 * 60 * 60 * 1000); // 1 day ago
        break;
      case '1w':
        cutoffDate = new Date(now - 7 * 24 * 60 * 60 * 1000); // 1 week ago
        break;
      case '1m':
        cutoffDate = new Date(now - 30 * 24 * 60 * 60 * 1000); // ~1 month ago
        break;
      default:
        return { timestamps, values };
    }
    
    // Filter and keep indices
    const filteredIndices = timestamps
      .map((date, index) => ({ date: new Date(date), index }))
      .filter(item => item.date >= cutoffDate)
      .map(item => item.index);
    
    // Use indices to filter both arrays
    const filteredTimestamps = filteredIndices.map(i => timestamps[i]);
    const filteredValues = filteredIndices.map(i => values[i]);
    
    return { timestamps: filteredTimestamps, values: filteredValues };
  };
  
  // Get available dates for the current timeframe
  const getTimeframeDates = () => {
    if (!data || !data.dates || data.dates.length === 0) return [];
    
    if (timeframe === 'all') return data.dates;
    
    const now = new Date();
    let cutoffDate;
    
    switch (timeframe) {
      case '6h':
        cutoffDate = new Date(now - 6 * 60 * 60 * 1000);
        break;
      case '12h':
        cutoffDate = new Date(now - 12 * 60 * 60 * 1000);
        break;
      case '1d':
        cutoffDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '1w':
        cutoffDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1m':
        cutoffDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return data.dates;
    }
    
    return data.dates.filter(dateStr => new Date(dateStr) >= cutoffDate);
  };
  
  // Prepare chart data
  const prepareChartData = () => {
    if (!data || !data.trends || !data.dates) return null;
    
    // If no accounts selected, use the top 5
    const accountsToShow = selectedAccounts.length > 0
      ? selectedAccounts
      : data.trends.slice(0, 5).map(account => account.username);
    
    // Filter trends for selected accounts
    const filteredTrends = data.trends.filter(trend => 
      accountsToShow.includes(trend.username)
    );
    
    // Get dates for the selected timeframe
    const timeframeDates = getTimeframeDates();
    
    // If no dates match the timeframe, return null
    if (timeframeDates.length === 0) return null;
    
    // Colors for chart lines
    const colors = [
      'rgb(255, 99, 132)',
      'rgb(54, 162, 235)',
      'rgb(255, 206, 86)',
      'rgb(75, 192, 192)',
      'rgb(153, 102, 255)',
      'rgb(255, 159, 64)',
      'rgb(199, 199, 199)',
      'rgb(83, 102, 255)',
      'rgb(40, 159, 64)',
      'rgb(210, 99, 132)',
    ];
    
    // Prepare datasets
    const datasets = filteredTrends.map((trend, index) => {
      const points = [];
      
      // Adapt to the new data structure from the microservice
      // For each date in the timeframe, find the corresponding follower count
      timeframeDates.forEach(date => {
        // Get index of this date in the timestamps array
        const dateIndex = trend.timestamps ? trend.timestamps.indexOf(date) : -1;
        
        // If the date exists in timestamps, use the corresponding follower count
        if (dateIndex >= 0 && trend.follower_counts && dateIndex < trend.follower_counts.length) {
          points.push(trend.follower_counts[dateIndex]);
        } else {
          // No data for this date
          points.push(null);
        }
      });
      
      return {
        label: `@${trend.username}`,
        data: points,
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length],
        tension: 0.2,
        pointRadius: timeframeDates.length < 10 ? 4 : timeframeDates.length < 20 ? 3 : 2,
      };
    });
    
    return {
      labels: timeframeDates,
      datasets,
    };
  };
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Follower Count Trends',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat().format(context.parsed.y);
            }
            return label + ' followers';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value) {
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(1) + 'K';
            }
            return value;
          }
        }
      }
    },
  };
  
  // Calculate growth statistics based on selected timeframe
  const calculateGrowth = () => {
    if (!data || !data.trends || data.dates.length < 2) return [];
    
    return data.trends.map(account => {
      // Check if we have follower counts data
      if (!account.follower_counts || account.follower_counts.length < 2) {
        // No data or not enough data points
        return {
          username: account.username,
          growth: null,
          growthPercentage: null,
          latestCount: account.follower_counts && account.follower_counts.length > 0 
            ? account.follower_counts[account.follower_counts.length - 1] 
            : 0,
          timeframe,
        };
      }
      
      // Get first and last follower counts for this account
      const firstCount = account.follower_counts[0];
      const lastCount = account.follower_counts[account.follower_counts.length - 1];
      
      // Get corresponding dates
      const firstDate = account.timestamps && account.timestamps.length > 0 
        ? new Date(account.timestamps[0]) 
        : new Date();
      const lastDate = account.timestamps && account.timestamps.length > 0 
        ? new Date(account.timestamps[account.timestamps.length - 1]) 
        : new Date();
      
      // Calculate absolute and percentage growth for the timeframe
      const growth = lastCount - firstCount;
      const growthPercentage = firstCount > 0 ? (growth / firstCount) * 100 : 0;
      
      // Calculate hourly rate for comparison
      const hoursDiff = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60));
      const hourlyRate = growth / hoursDiff;
      
      return {
        username: account.username,
        growth,
        growthPercentage,
        latestCount: lastCount,
        timeframe,
        hourlyRate,
        firstDate,
        lastDate
      };
    })
    .sort((a, b) => (b.growthPercentage || 0) - (a.growthPercentage || 0));
  };
  
  // Format number with K/M suffix
  const formatNumber = (num) => {
    if (!num && num !== 0) return 'N/A';
    
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    } else {
      return num.toString();
    }
  };
  
  // Growth stats cards
  const growthStats = calculateGrowth();
  const chartData = prepareChartData();
  
  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 3 }}>
        Follower Growth Trends
      </Typography>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading trend data: {error?.message || 'Unknown error'}
        </Alert>
      ) : !data || data.dates.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No historical data available yet. Trends will appear once multiple data points have been collected.
        </Alert>
      ) : (
        <>
          <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Follower Growth Chart
                </Typography>
                
                {/* Timeframe selector */}
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Timeframe:
                  </Typography>
                  <ToggleButtonGroup
                    value={timeframe}
                    exclusive
                    onChange={handleTimeframeChange}
                    size="small"
                    aria-label="timeframe"
                  >
                    <ToggleButton value="6h">
                      <Tooltip title="Last 6 hours">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} />
                          6h
                        </Box>
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="12h">
                      <Tooltip title="Last 12 hours">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} />
                          12h
                        </Box>
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="1d">
                      <Tooltip title="Last 24 hours">
                        <span>1d</span>
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="1w">
                      <Tooltip title="Last 7 days">
                        <span>1w</span>
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="1m">
                      <Tooltip title="Last 30 days">
                        <span>1m</span>
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="all">
                      <Tooltip title="All available data">
                        <span>All</span>
                      </Tooltip>
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Box>
              
              {/* Account search and selection UI */}
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Autocomplete
                  sx={{ flex: 1 }}
                  options={data.trends.map(account => account.username)}
                  value={searchValue}
                  onChange={(event, newValue) => {
                    handleAddAccount(newValue);
                  }}
                  inputValue={inputValue}
                  onInputChange={(event, newInputValue) => {
                    setInputValue(newInputValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search for an account"
                      variant="outlined"
                      fullWidth
                      helperText={`You can add up to ${MAX_ACCOUNTS} accounts`}
                    />
                  )}
                  disableClearable
                  disabled={selectedAccounts.length >= MAX_ACCOUNTS}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleAddAccount(inputValue)}
                  disabled={!inputValue || selectedAccounts.length >= MAX_ACCOUNTS || selectedAccounts.includes(inputValue)}
                  startIcon={<AddIcon />}
                  sx={{ mt: 1 }}
                >
                  Add
                </Button>
                {selectedAccounts.length > 0 && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleClearAll}
                    sx={{ mt: 1 }}
                  >
                    Clear All
                  </Button>
                )}
              </Box>
              
              {/* Selected accounts chips */}
              {selectedAccounts.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Selected accounts:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {selectedAccounts.map((username) => (
                      <Chip
                        key={username}
                        label={`@${username}`}
                        onDelete={() => handleRemoveAccount(username)}
                        deleteIcon={<CloseIcon />}
                        color="primary"
                        variant="outlined"
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
              
              <Alert severity="info" sx={{ mb: 2 }}>
                {`Showing ${selectedAccounts.length > 0 
                  ? `${selectedAccounts.length} selected account${selectedAccounts.length > 1 ? 's' : ''}` 
                  : 'top 5 accounts by follower count'
                } for ${timeframe === 'all' 
                  ? 'all available data' 
                  : `the last ${
                      timeframe === '6h' ? '6 hours' : 
                      timeframe === '12h' ? '12 hours' : 
                      timeframe === '1d' ? '24 hours' : 
                      timeframe === '1w' ? '7 days' : 
                      '30 days'
                    }`
                  }. ${selectedAccounts.length === 0 ? 'Search and add accounts above to customize the chart.' : ''}`
                }
              </Alert>
              
              <Box sx={{ height: 400 }}>
                {chartData && <Line options={chartOptions} data={chartData} />}
              </Box>
            </Box>
          </Paper>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Growth Rankings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {timeframe === 'all' 
                ? 'All-time growth' 
                : `Growth in the last ${
                    timeframe === '6h' ? '6 hours' : 
                    timeframe === '12h' ? '12 hours' : 
                    timeframe === '1d' ? '24 hours' : 
                    timeframe === '1w' ? '7 days' : 
                    '30 days'
                  }`
                }
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {growthStats.slice(0, 10).map((stat, index) => (
              <Grid item xs={12} sm={6} md={4} key={stat.username}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography 
                      variant="subtitle1" 
                      component="h3" 
                      sx={{ fontWeight: 'bold', mb: 1 }}
                    >
                      {index + 1}. @{stat.username}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Current:
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formatNumber(stat.latestCount)} followers
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Growth:
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color={stat.growth > 0 ? 'success.main' : stat.growth < 0 ? 'error.main' : 'text.primary'}
                        fontWeight="bold"
                      >
                        {stat.growth !== null ? `${stat.growth > 0 ? '+' : ''}${formatNumber(stat.growth)}` : 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Growth %:
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color={stat.growthPercentage > 0 ? 'success.main' : stat.growthPercentage < 0 ? 'error.main' : 'text.primary'}
                        fontWeight="bold"
                      >
                        {stat.growthPercentage !== null ? `${stat.growthPercentage > 0 ? '+' : ''}${stat.growthPercentage.toFixed(2)}%` : 'N/A'}
                      </Typography>
                    </Box>
                    
                    {/* Only show hourly rate for timeframes other than "all" */}
                    {timeframe !== 'all' && stat.hourlyRate !== undefined && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Hourly rate:
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color={stat.hourlyRate > 0 ? 'success.main' : stat.hourlyRate < 0 ? 'error.main' : 'text.primary'}
                          fontWeight="bold"
                        >
                          {stat.hourlyRate !== null ? `${stat.hourlyRate > 0 ? '+' : ''}${stat.hourlyRate.toFixed(1)}/hr` : 'N/A'}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
};

export default Trends;