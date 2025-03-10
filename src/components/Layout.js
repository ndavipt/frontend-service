import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  Container,
  Divider,
  Avatar,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import InfoIcon from '@mui/icons-material/Info';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import InstagramIcon from '@mui/icons-material/Instagram';
import ApiIcon from '@mui/icons-material/Api';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ScienceIcon from '@mui/icons-material/Science';

// Navigation items for the sidebar/navbar
const navItems = [
  { name: 'Leaderboard', path: '/', icon: <LeaderboardIcon /> },
  { name: 'Trends', path: '/trends', icon: <ShowChartIcon /> },
  { name: 'Submit Account', path: '/submit', icon: <AddCircleOutlineIcon /> },
  { name: 'About', path: '/about', icon: <InfoIcon /> },
];

const Layout = ({ children, toggleTheme, mode }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Toggle the drawer
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Navigate to a page and close the drawer on mobile
  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  // The drawer content
  const drawer = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
        <InstagramIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          AI Leaderboard
        </Typography>
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem 
            button 
            key={item.name}
            onClick={() => handleNavigation(item.path)}
            selected={location.pathname === item.path}
            sx={{
              my: 0.5,
              borderRadius: 1,
              mx: 1,
              '&.Mui-selected': {
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.08)' 
                  : 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            <ListItemIcon>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.name} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem 
          button 
          onClick={() => handleNavigation('/api-test')}
          selected={location.pathname === '/api-test'}
          sx={{
            my: 0.5,
            borderRadius: 1,
            mx: 1,
            '&.Mui-selected': {
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.08)' 
                : 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <ListItemIcon>
            <ApiIcon />
          </ListItemIcon>
          <ListItemText primary="API Test" />
        </ListItem>
        
        <ListItem 
          button 
          onClick={() => handleNavigation('/admin')}
          selected={location.pathname === '/admin'}
          sx={{
            my: 0.5,
            borderRadius: 1,
            mx: 1,
            '&.Mui-selected': {
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.08)' 
                : 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <ListItemIcon>
            <AdminPanelSettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Admin" />
        </ListItem>
        
        <ListItem 
          button 
          onClick={() => handleNavigation('/test-growth')}
          selected={location.pathname === '/test-growth'}
          sx={{
            my: 0.5,
            borderRadius: 1,
            mx: 1,
            '&.Mui-selected': {
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.08)' 
                : 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <ListItemIcon>
            <ScienceIcon />
          </ListItemIcon>
          <ListItemText primary="Test Growth Logic" />
        </ListItem>
      </List>
      <Divider />
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
          <IconButton onClick={toggleTheme} color="inherit">
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* App Bar */}
      <AppBar 
        position="fixed" 
        elevation={1}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          width: '100%'
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <InstagramIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Instagram AI Leaderboard
          </Typography>
          
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {navItems.map((item) => (
                <Button 
                  key={item.name}
                  onClick={() => handleNavigation(item.path)}
                  sx={{ 
                    mx: 1,
                    color: 'white',
                    backgroundColor: location.pathname === item.path 
                      ? 'rgba(255, 255, 255, 0.15)' 
                      : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    }
                  }}
                  startIcon={item.icon}
                >
                  {item.name}
                </Button>
              ))}
              <Button 
                onClick={() => handleNavigation('/api-test')}
                sx={{ 
                  mx: 1,
                  color: 'white',
                  backgroundColor: location.pathname === '/api-test' 
                    ? 'rgba(255, 255, 255, 0.15)' 
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  }
                }}
                startIcon={<ApiIcon />}
              >
                API Test
              </Button>
              <Button 
                onClick={() => handleNavigation('/admin')}
                sx={{ 
                  mx: 1,
                  color: 'white',
                  backgroundColor: location.pathname === '/admin' 
                    ? 'rgba(255, 255, 255, 0.15)' 
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  }
                }}
                startIcon={<AdminPanelSettingsIcon />}
              >
                Admin
              </Button>
              <Button 
                onClick={() => handleNavigation('/test-growth')}
                sx={{ 
                  mx: 1,
                  color: 'white',
                  backgroundColor: location.pathname === '/test-growth' 
                    ? 'rgba(255, 255, 255, 0.15)' 
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  }
                }}
                startIcon={<ScienceIcon />}
              >
                Test Growth
              </Button>
              <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
                <IconButton onClick={toggleTheme} color="inherit">
                  {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      {/* Mobile Drawer (temporary) */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 250 
          },
        }}
      >
        {drawer}
      </Drawer>
      
      {/* Desktop Drawer (permanent) */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: 250,
            flexShrink: 0,
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              width: 250,
              boxSizing: 'border-box',
              borderRight: '0px solid transparent',
              pt: 8, // Add padding top to account for AppBar
              zIndex: 1,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      )}
      
      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0, // No padding at all
          pt: 2, // Some top padding
          mt: 8, // Space for AppBar
          width: { xs: '100%', md: 'calc(100% - 250px)' },
          ml: { xs: 0, md: '250px' },
          display: 'flex',
          flexDirection: 'column',
          // Add subtle background color to main area
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.01)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;