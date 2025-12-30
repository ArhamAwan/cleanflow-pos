/**
 * CleanFlow POS Sync Server
 * 
 * Express server for synchronizing data between multiple PCs running CleanFlow POS.
 * Handles upload, download, conflict resolution, and dependency management.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { pool, testConnection } = require('./config/database');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const clockSkewMiddleware = require('./middleware/clockSkew');

// Import routes
const healthRoutes = require('./routes/health');
const syncRoutes = require('./routes/sync');
const dependenciesRoutes = require('./routes/dependencies');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for Electron app
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-ID', 'X-Client-Timestamp']
}));
app.use(express.json({ limit: '10mb' })); // Large payloads for batch sync
app.use(clockSkewMiddleware);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`, {
      deviceId: req.headers['x-device-id'],
      ip: req.ip
    });
  });
  next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/dependencies', dependenciesRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'CleanFlow POS Sync Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      sync: '/api/sync',
      dependencies: '/api/dependencies'
    }
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database. Server not started.');
      process.exit(1);
    }
    
    app.listen(PORT, () => {
      logger.info(`🚀 CleanFlow POS Sync Server running on port ${PORT}`);
      logger.info(`📊 Database connected successfully`);
      logger.info(`🌐 CORS enabled for all origins`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Closing server...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Closing server...');
  await pool.end();
  process.exit(0);
});

startServer();

module.exports = app;

