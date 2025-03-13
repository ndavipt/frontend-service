import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './custom-styles.css'; // Import custom styles AFTER index.css to ensure they override
import App from './App';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import { LOGIC_SERVICE_URL, SCRAPER_API_URL } from './config';

// Log environment configuration
console.log('==== Environment Configuration ====');
console.log('Runtime Environment:', process.env.NODE_ENV);
console.log('Logic Service URL:', LOGIC_SERVICE_URL);
console.log('Scraper API URL:', SCRAPER_API_URL);
console.log('window._env_:', window._env_);
console.log('================================');

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);