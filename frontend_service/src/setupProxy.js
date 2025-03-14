const { createProxyMiddleware } = require('http-proxy-middleware');

// Load config (via require for Node.js compatibility in setupProxy.js)
// We'll define the constants directly since we can't import from ../config.js
const API_PORT = 5050;
const API_PREFIX = '/api';
const DATA_PATH = '/data';
const IMAGE_ROUTE = '/images';

// Logic Service specific route for direct connections
const LOGIC_ROUTE = '/logic';
const LOGIC_SERVICE_URL = 'https://logic-service-2s7j.onrender.com'; // Direct URL to Logic Service

module.exports = function(app) {
  console.log('Setting up proxy middleware for development server');
  
  // Get backend URL from environment variable or use default
  const serverUrl = process.env.REACT_APP_API_URL || `http://localhost:${API_PORT}`;
  console.log(`Using backend server URL: ${serverUrl}`);
  
  // Configuration object for backend routes
  const backendProxyConfig = {
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
  
  // Configuration for Logic Service direct connections
  const logicServiceProxyConfig = {
    target: LOGIC_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/logic': '/api/v1', // Rewrite /logic routes to /api/v1 on the Logic Service
    },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      console.log(`Proxying to Logic Service: ${req.method} ${req.path} -> ${LOGIC_SERVICE_URL}${req.path.replace('/logic', '/api/v1')}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`Logic Service response: ${proxyRes.statusCode} for ${req.method} ${req.path}`);
      
      // Add CORS headers to the response
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
      proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    },
    onError: (err, req, res) => {
      console.error(`Logic Service proxy error: ${err.message}`);
      console.error(`Failed request: ${req.method} ${req.path}`);
      
      // Send a useful error response to the client
      if (!res.headersSent) {
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ 
          error: 'Logic Service connection error', 
          message: err.message 
        }));
      }
    }
  };
  
  // Routes to proxy to backend - defined using constants for consistency
  const backendRoutes = [
    API_PREFIX,      // All API endpoints
    DATA_PATH,       // Data directory for files and images
    IMAGE_ROUTE      // Dedicated image route
  ];
  
  // Apply backend proxy to routes
  backendRoutes.forEach(route => {
    console.log(`Setting up proxy for ${route} -> ${serverUrl}${route}`);
    app.use(route, createProxyMiddleware(backendProxyConfig));
  });
  
  // Set up direct proxy to Logic Service for /logic/* routes
  console.log(`Setting up direct proxy for ${LOGIC_ROUTE}/* -> ${LOGIC_SERVICE_URL}/api/v1/*`);
  app.use(LOGIC_ROUTE, createProxyMiddleware(logicServiceProxyConfig));
  
  console.log('Proxy middleware setup complete');
};