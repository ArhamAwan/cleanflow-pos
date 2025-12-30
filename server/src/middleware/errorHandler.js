/**
 * Express Error Handler Middleware
 */

const logger = require('../config/logger');

function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Request error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    deviceId: req.headers['x-device-id']
  });
  
  // Determine status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Build response
  const response = {
    success: false,
    error: err.name || 'Error',
    message: err.message || 'Internal server error'
  };
  
  // Add details in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }
  
  // Add validation errors if present
  if (err.errors) {
    response.errors = err.errors;
  }
  
  res.status(statusCode).json(response);
}

/**
 * Create a custom error with status code
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error with field details
 */
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Not found error
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

module.exports = errorHandler;
module.exports.AppError = AppError;
module.exports.ValidationError = ValidationError;
module.exports.NotFoundError = NotFoundError;
module.exports.ConflictError = ConflictError;

