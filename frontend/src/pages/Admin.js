import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  TextField,
  IconButton,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  InputAdornment,
  Input,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LockIcon from '@mui/icons-material/Lock';
import InstagramIcon from '@mui/icons-material/Instagram';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';

import { 
  fetchPendingAccounts, 
  fetchTrackedAccounts,
  approveAccount, 
  rejectAccount,
  removeAccount
} from '../services/api';

const Admin = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  
  // Authentication state (simple version for demo)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null
  });
  
  // Notification state
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Fetch pending accounts
  const {
    data: pendingData,
    isLoading: isPendingLoading,
    isError: isPendingError,
    error: pendingError,
    refetch: refetchPending,
  } = useQuery('pendingAccounts', fetchPendingAccounts, {
    enabled: isLoggedIn, // Only fetch if logged in
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Fetch tracked accounts
  const {
    data: trackedData,
    isLoading: isTrackedLoading,
    isError: isTrackedError,
    error: trackedError,
    refetch: refetchTracked,
  } = useQuery('trackedAccounts', fetchTrackedAccounts, {
    enabled: isLoggedIn, // Only fetch if logged in
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Mutation for approving accounts
  const approveMutation = useMutation(approveAccount, {
    onSuccess: (data) => {
      queryClient.invalidateQueries('pendingAccounts');
      queryClient.invalidateQueries('trackedAccounts');
      setNotification({
        open: true,
        message: `Account ${data.message}`,
        severity: 'success',
      });
    },
  });
  
  // Mutation for rejecting accounts
  const rejectMutation = useMutation(rejectAccount, {
    onSuccess: (data) => {
      queryClient.invalidateQueries('pendingAccounts');
      setNotification({
        open: true,
        message: `Account ${data.message}`,
        severity: 'info',
      });
    },
  });
  
  // Mutation for removing accounts
  const removeMutation = useMutation(removeAccount, {
    onSuccess: (data) => {
      queryClient.invalidateQueries('trackedAccounts');
      setNotification({
        open: true,
        message: `Account ${data.message}`,
        severity: 'success',
      });
    },
  });
  
  // Simple login handler
  const handleLogin = () => {
    // This is a very simple authentication method
    // In production, use a real authentication system
    if (password === 'admin123') {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Invalid password');
    }
  };
  
  // Handle approve/reject/remove
  const handleApprove = (username) => {
    approveMutation.mutate(username);
  };
  
  const handleReject = (username) => {
    rejectMutation.mutate(username);
  };
  
  const handleRemove = (username) => {
    setConfirmDialog({
      open: true,
      title: 'Remove Account',
      message: `Are you sure you want to remove @${username} from tracking? This action cannot be undone.`,
      onConfirm: () => {
        removeMutation.mutate(username);
        setConfirmDialog({ ...confirmDialog, open: false });
      }
    });
  };
  
  // Handle confirmation dialog close
  const handleCloseConfirmDialog = () => {
    setConfirmDialog({ ...confirmDialog, open: false });
  };
  
  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };
  
  // Filter tracked accounts based on search term
  const filteredTrackedAccounts = trackedData?.accounts?.filter(account => {
    if (!searchTerm) return true;
    return account.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (account.submitter && account.submitter.toLowerCase().includes(searchTerm.toLowerCase()));
  }) || [];
  
  // Login form
  if (!isLoggedIn) {
    return (
      <Box sx={{ p: 3, maxWidth: 500, mx: 'auto', mt: 5 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <LockIcon sx={{ mr: 1 }} /> Admin Login
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Enter the admin password to access the account management dashboard.
          </Typography>
          
          <TextField
            label="Password"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            error={!!loginError}
            helperText={loginError}
            sx={{ mb: 2 }}
          />
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleLogin}
            fullWidth
          >
            Login
          </Button>
        </Paper>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Account Management
      </Typography>
      
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="admin tabs">
          <Tab label="Pending Accounts" />
          <Tab label="Tracked Accounts" />
          <Tab label="Admin Guide" />
        </Tabs>
      </Box>
      
      {/* Pending Accounts Tab */}
      {activeTab === 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Pending Accounts
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Click the Instagram icon or "View Profile" button to verify these are legitimate AI accounts before approval.
          </Typography>
          
          {isPendingLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : isPendingError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              Error loading pending accounts: {pendingError?.message}
            </Alert>
          ) : pendingData?.pending?.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              No pending accounts to review at this time.
            </Alert>
          ) : (
            <List>
              {pendingData?.pending?.map((account, index) => (
                <React.Fragment key={account.username}>
                  <ListItem 
                    alignItems="flex-start"
                    secondaryAction={
                      <Box>
                        <IconButton 
                          edge="end" 
                          color="primary" 
                          onClick={() => handleApprove(account.username)}
                          title="Approve"
                          disabled={approveMutation.isLoading || rejectMutation.isLoading}
                        >
                          <CheckCircleIcon />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          color="error" 
                          onClick={() => handleReject(account.username)}
                          title="Reject"
                          disabled={approveMutation.isLoading || rejectMutation.isLoading}
                        >
                          <CancelIcon />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={
                        <Typography variant="h6" component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                          @{account.username}
                          <IconButton
                            size="small"
                            href={`https://instagram.com/${account.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ ml: 1 }}
                            color="primary"
                          >
                            <InstagramIcon fontSize="small" />
                          </IconButton>
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            Submitted by: {account.submitter}
                          </Typography>
                          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                            <Button 
                              variant="outlined" 
                              size="small"
                              href={`https://instagram.com/${account.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              startIcon={<InstagramIcon />}
                              sx={{ mr: 1, fontSize: '0.75rem' }}
                            >
                              View Profile
                            </Button>
                            <Typography component="span" variant="caption" color="text.secondary">
                              Submitted: {new Date(account.submitted_at || account.timestamp).toLocaleString()}
                            </Typography>
                          </Box>
                        </>
                      }
                    />
                  </ListItem>
                  {index < pendingData.pending.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
          
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => refetchPending()} 
            sx={{ mt: 2 }}
            disabled={isPendingLoading}
          >
            Refresh List
          </Button>
        </Paper>
      )}
      
      {/* Tracked Accounts Tab */}
      {activeTab === 1 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Tracked Accounts
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              {trackedData?.accounts?.length || 0} accounts currently being tracked
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Input
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                startAdornment={
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                }
                sx={{ mr: 2 }}
              />
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={() => refetchTracked()} 
                disabled={isTrackedLoading}
                size="small"
              >
                Refresh
              </Button>
            </Box>
          </Box>
          
          {isTrackedLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : isTrackedError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              Error loading tracked accounts: {trackedError?.message}
            </Alert>
          ) : filteredTrackedAccounts.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              {searchTerm ? "No accounts match your search." : "No accounts are currently being tracked."}
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Username</strong></TableCell>
                    <TableCell><strong>Added By</strong></TableCell>
                    <TableCell><strong>Added On</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTrackedAccounts.map(account => (
                    <TableRow key={account.username} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <a 
                            href={`https://instagram.com/${account.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none', color: 'inherit', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}
                          >
                            @{account.username}
                            <InstagramIcon fontSize="small" sx={{ ml: 0.5, color: theme.palette.primary.main }} />
                          </a>
                        </Box>
                      </TableCell>
                      <TableCell>{account.submitter || 'Unknown'}</TableCell>
                      <TableCell>
                        {account.added ? new Date(account.added).toLocaleDateString() : 'Unknown'}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          color="error" 
                          onClick={() => handleRemove(account.username)}
                          title="Remove Account"
                          size="small"
                          disabled={removeMutation.isLoading}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          <Typography variant="body2" color="text.secondary">
            Note: Removing an account will stop tracking it, but previous data will remain in the database.
          </Typography>
        </Paper>
      )}
      
      {/* Admin Guide Tab */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Admin Guide
          </Typography>
          
          <Typography variant="body1" paragraph>
            Use this admin panel to review and manage user-submitted Instagram accounts.
          </Typography>
          
          <Typography variant="h6" component="h3" gutterBottom>
            Review Process:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemText 
                primary="1. Check the Instagram profile" 
                secondary="Click the Instagram icon or View Profile button to verify it's a legitimate AI-generated account"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="2. Look for AI indicators" 
                secondary="Check bio for AI mentions, image quality and aesthetic traits typical of AI generation"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="3. Approve or reject" 
                secondary="Use the checkmark (approve) or X (reject) buttons to make your decision"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="4. Managing tracked accounts" 
                secondary="Use the Tracked Accounts tab to see all accounts and remove any that should no longer be tracked"
              />
            </ListItem>
          </List>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            Approved accounts will immediately appear on the leaderboard after their data is scraped.
          </Alert>
        </Paper>
      )}
      
      <Button 
        variant="contained" 
        color="secondary" 
        onClick={() => setIsLoggedIn(false)} 
        sx={{ mt: 2 }}
      >
        Logout
      </Button>
      
      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={handleCloseConfirmDialog}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDialog.onConfirm} color="error" variant="contained">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Admin;