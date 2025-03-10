import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  Divider,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import axios from 'axios';
import { testApiConnection } from '../services/api';

/**
 * Enhanced API test component to debug connectivity issues
 * Makes direct fetch to the API and displays the results with detailed debugging info
 */
const APITest = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testUrl, setTestUrl] = useState('/api/leaderboard');
  const [connectionMethod, setConnectionMethod] = useState('proxy');
  const [diagnosticInfo, setDiagnosticInfo] = useState({});

  // Function to run diagnostics and collect system info
  useEffect(() => {
    const collectDiagnostics = () => {
      try {
        setDiagnosticInfo({
          userAgent: navigator.userAgent,
          hostname: window.location.hostname,
          port: window.location.port,
          protocol: window.location.protocol,
          referrer: document.referrer,
          timestamp: new Date().toISOString(),
          screenSize: `${window.innerWidth}x${window.innerHeight}`
        });
      } catch (err) {
        console.error('Error collecting diagnostics:', err);
      }
    };
    
    collectDiagnostics();
  }, []);

  // Function to test the API with the selected connection method
  const testAPI = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    
    try {
      console.log(`Testing API URL: ${testUrl} using ${connectionMethod} connection`);
      
      // Create request config based on connection method
      let response;
      if (connectionMethod === 'proxy') {
        // Use standard Axios request through the React dev server proxy
        response = await axios.get(testUrl);
      } else if (connectionMethod === 'direct') {
        // Try a direct connection to the backend
        const directUrl = `http://localhost:5050${testUrl}`;
        console.log(`Trying direct connection to: ${directUrl}`);
        response = await axios.get(directUrl, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        });
      } else if (connectionMethod === 'test-server') {
        // Connect to our minimal test server
        await testApiConnection();
        const testServerUrl = testUrl === '/api/leaderboard' ? '/api/leaderboard' : testUrl;
        response = await axios.get(testServerUrl);
      }
      
      console.log('API Response:', response);
      setData(response.data);
    } catch (err) {
      console.error('API Error:', err);
      setError({
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        stack: err.stack
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 3 }}>
        API Connectivity Debugger
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Test API Connection
        </Typography>
        
        <Stack spacing={2} direction="row" sx={{ mb: 2 }}>
          <Chip 
            label={`Environment: ${process.env.NODE_ENV}`}
            color="primary" 
            variant="outlined"
          />
          <Chip 
            label={`Protocol: ${window.location.protocol}`}
            color="secondary" 
            variant="outlined"
          />
          <Chip 
            label={`Frontend: ${window.location.host}`}
            color="info" 
            variant="outlined"
          />
        </Stack>

        <FormControl fullWidth margin="normal">
          <InputLabel id="connection-method-label">Connection Method</InputLabel>
          <Select
            labelId="connection-method-label"
            value={connectionMethod}
            onChange={(e) => setConnectionMethod(e.target.value)}
            label="Connection Method"
          >
            <MenuItem value="proxy">React Dev Server Proxy (Default)</MenuItem>
            <MenuItem value="direct">Direct Backend Connection</MenuItem>
            <MenuItem value="test-server">Test Server</MenuItem>
          </Select>
        </FormControl>
        
        <TextField
          fullWidth
          label="API URL to test"
          value={testUrl}
          onChange={(e) => setTestUrl(e.target.value)}
          margin="normal"
          variant="outlined"
          helperText={
            connectionMethod === 'direct' 
              ? `Will connect to: http://localhost:5050${testUrl}` 
              : connectionMethod === 'test-server'
                ? 'Will connect to the minimal test server'
                : 'Will proxy through React development server'
          }
        />
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={testAPI}
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Test API Connection'}
        </Button>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Error Testing API:
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {error.message}
            {error.status && ` (Status: ${error.status} ${error.statusText})`}
          </Typography>
          
          {error.data && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Response Data:
              </Typography>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem' }}>
                {typeof error.data === 'string' ? error.data : JSON.stringify(error.data, null, 2)}
              </pre>
            </>
          )}
          
          <Divider sx={{ my: 1 }} />
          
          <Typography variant="subtitle2">
            Troubleshooting Tips:
          </Typography>
          <ul style={{ marginTop: 0 }}>
            <li>Check that the backend server is running at http://localhost:5050</li>
            <li>Try the direct connection method which bypasses the proxy</li>
            <li>Try using the test server option which uses a simplified backend</li>
            <li>Check browser console for CORS or network errors</li>
          </ul>
        </Alert>
      )}
      
      {data && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            API Response:
          </Typography>
          <Alert severity="success" sx={{ mb: 2 }}>
            Connection successful! The API is responding properly.
          </Alert>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '4px',
            overflowX: 'auto',
            maxHeight: '300px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </Paper>
      )}

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          System Diagnostics
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          This information can help troubleshoot connectivity issues:
        </Typography>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '4px',
          fontSize: '0.8rem'
        }}>
          {JSON.stringify(diagnosticInfo, null, 2)}
        </pre>
      </Paper>
    </Box>
  );
};

export default APITest;