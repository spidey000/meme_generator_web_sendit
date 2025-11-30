// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Authentication middleware for API endpoints
app.use('/api/', async (req, res, next) => {
  console.log(`[DEBUG] Auth middleware: ${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    headers: req.headers,
    env: process.env.NODE_ENV
  });
  
  // Skip authentication for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    console.log('[DEBUG] Skipping auth for OPTIONS request');
    return next();
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG] Skipping auth in development mode');
    return next(); // Skip auth in development
  }
  
  const authHeader = req.headers.authorization;
  console.log('[DEBUG] Auth header:', authHeader ? 'Present' : 'Missing');
  
  if (!authHeader) {
    console.log('[DEBUG] Returning 401 - Missing authentication');
    return res.status(401).json({ error: 'Missing authentication' });
  }
  
  // Simple validation for now - enhance later
  if (!authHeader.startsWith('Bearer ')) {
    console.log('[DEBUG] Returning 401 - Invalid authentication format');
    return res.status(401).json({ error: 'Invalid authentication format' });
  }
  
  console.log('[DEBUG] Authentication successful, proceeding to next middleware');
  next();
});

// Import API endpoints
const healthRouter = require('./api/health');
const botTestRouter = require('./api/bot-test');
const logsRouter = require('./api/logs');
const clientLogRouter = require('./api/client-log');
const uploadImageRouter = require('./api/upload-image');
const prepareMessageRouter = require('./api/prepare-message');

// Use API routes
app.use('/api/health', healthRouter);
app.use('/api/bot-test', botTestRouter);
app.use('/api/logs', logsRouter);
app.use('/api/client-log', clientLogRouter);
app.use('/api/upload-image', uploadImageRouter);
app.use('/api/prepare-message', prepareMessageRouter);

// Health check for the server itself
app.get('/', (req, res) => {
  res.json({
    message: 'Meme Generator API Server',
    status: 'running',
    port: PORT,
    endpoints: [
      '/api/health',
      '/api/bot-test',
      '/api/logs',
      '/api/client-log',
      '/api/upload-image',
      '/api/prepare-message'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📡 Available endpoints:`);
  console.log(`   GET  / - Server status`);
  console.log(`   GET  /api/health - Health check`);
  console.log(`   POST /api/bot-test - Bot testing`);
  console.log(`   GET/POST /api/logs - Log management`);
  console.log(`   POST /api/client-log - Client logging`);
  console.log(`   POST /api/upload-image - Image upload`);
  console.log(`   POST /api/prepare-message - Message preparation`);
});