import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Leaderboard from './pages/Leaderboard';
import Trends from './pages/Trends';
import About from './pages/About';
import SubmitAccount from './pages/SubmitAccount';
import APITest from './pages/APITest';
import Admin from './pages/Admin';
import TestGrowth from './pages/TestGrowth';

// Create a dark/light theme
const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: '#E1306C', // Instagram pink
    },
    secondary: {
      main: '#405DE6', // Instagram blue
    },
    background: {
      default: mode === 'dark' ? '#121212' : '#f5f5f5',
      paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: mode === 'dark' 
            ? '0 4px 20px rgba(0, 0, 0, 0.5)' 
            : '0 4px 20px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

function App() {
  // State for dark/light mode
  const [mode, setMode] = useState('light');
  const theme = getTheme(mode);

  // Signal that the app has loaded successfully
  React.useEffect(() => {
    window.dispatchEvent(new Event('appLoaded'));
    console.log('App component mounted successfully');
  }, []);

  // Toggle dark/light mode
  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout toggleTheme={toggleTheme} mode={mode}>
        <Routes>
          <Route path="/" element={<Leaderboard />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/submit" element={<SubmitAccount />} />
          <Route path="/about" element={<About />} />
          <Route path="/api-test" element={<APITest />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/test-growth" element={<TestGrowth />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  );
}

export default App;