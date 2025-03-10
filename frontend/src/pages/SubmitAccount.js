import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  AlertTitle,
  CircularProgress,
  Divider,
  InputAdornment,
} from '@mui/material';
import { useMutation } from 'react-query';
import { submitAccount } from '../services/api';
import InstagramIcon from '@mui/icons-material/Instagram';
import PersonIcon from '@mui/icons-material/Person';

const SubmitAccount = () => {
  // Form state
  const [username, setUsername] = useState('');
  const [submitter, setSubmitter] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Clean username (remove @ if present)
  const cleanUsername = (input) => {
    return input.trim().replace(/^@/, '');
  };
  
  // Submit mutation
  const submitMutation = useMutation(
    (data) => submitAccount(data.username, data.submitter),
    {
      onSuccess: (response) => {
        if (response.success) {
          setSuccessMessage(response.message);
          // Reset form
          setUsername('');
          setSubmitter('');
          setError('');
        } else {
          setError(response.message || 'Submission failed');
          setSuccessMessage('');
        }
      },
      onError: (err) => {
        setError(err.response?.data?.message || err.message || 'An error occurred');
        setSuccessMessage('');
      },
    }
  );
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Reset messages
    setError('');
    setSuccessMessage('');
    
    // Validate username
    const cleanedUsername = cleanUsername(username);
    if (!cleanedUsername) {
      setError('Username is required');
      return;
    }
    
    // Submit to API
    submitMutation.mutate({
      username: cleanedUsername,
      submitter: submitter.trim() || 'Anonymous',
    });
  };
  
  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 3 }}>
        Submit an Account
      </Typography>
      
      <Paper elevation={0} sx={{ p: 4, borderRadius: 2, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="body1" gutterBottom>
          Know an AI-generated Instagram account that should be on our leaderboard? Submit it below for our review.
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <TextField
            fullWidth
            label="Instagram Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="normal"
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <InstagramIcon />
                </InputAdornment>
              ),
            }}
            placeholder="e.g., username (without @)"
            helperText="Enter the Instagram username without the @ symbol"
          />
          
          <TextField
            fullWidth
            label="Your Name (Optional)"
            value={submitter}
            onChange={(e) => setSubmitter(e.target.value)}
            margin="normal"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon />
                </InputAdornment>
              ),
            }}
            placeholder="Anonymous"
            helperText="Leave blank to submit anonymously"
          />
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            sx={{ mt: 3 }}
            disabled={submitMutation.isLoading || !username.trim()}
          >
            {submitMutation.isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Submit Account'
            )}
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}
        
        {successMessage && (
          <Alert severity="success" sx={{ mt: 3 }}>
            <AlertTitle>Success</AlertTitle>
            {successMessage}
          </Alert>
        )}
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="body2" color="text.secondary">
          Note: All submissions are reviewed for authenticity before being added to the leaderboard. We only track publicly available Instagram profiles that are known to be AI-generated.
        </Typography>
      </Paper>
    </Box>
  );
};

export default SubmitAccount;