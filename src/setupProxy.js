const { createProxyMiddleware } = require('http-proxy-middleware');

// Load config (via require for Node.js compatibility in setupProxy.js)
// We'll define the constants directly since we can't import from ../config.js
const API_PORT = 5050;
const API_PREFIX = '/api';
const DATA_PATH = '/data';
const IMAGE_ROUTE = '/images';

module.exports = function(app) {
  console.log('Setting up proxy middleware for development server');
  
  // Get backend URL from environment variable or use default
  const serverUrl = process.env.REACT_APP_API_URL || `http://localhost:${API_PORT}`;
  console.log(`Using backend server URL: ${serverUrl}`);
  
  // Configuration object for all routes
  const proxyConfig = {
    target: serverUrl,
    changeOrigin: true,
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      console.log(`Proxying request: ${req.method} ${req.path} -> ${serverUrl}${req.path}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`Proxy response: ${proxyRes.statusCode} for ${req.method} ${req.path}`);
    },
    onError: (err, req, res) => {
      console.error(`Proxy error: ${err.message}`);
      console.error(`Failed request: ${req.method} ${req.path}`);
    }
  };
  
  // Routes to proxy - defined using constants for consistency
  const routes = [
    API_PREFIX,      // All API endpoints
    DATA_PATH,       // Data directory for files and images
    IMAGE_ROUTE      // Dedicated image route
  ];
  
  // Apply proxy to all routes
  routes.forEach(route => {
    console.log(`Setting up proxy for ${route} -> ${serverUrl}${route}`);
    app.use(route, createProxyMiddleware(proxyConfig));
  });
  
  console.log('Proxy middleware setup complete');
};