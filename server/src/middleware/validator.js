/**
 * Request Validation Middleware
 */

const { validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');

/**
 * Validate request using express-validator
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }));
    
    throw new ValidationError('Validation failed', formattedErrors);
  }
  
  next();
}

/**
 * Validate device ID header is present
 */
function requireDeviceId(req, res, next) {
  const deviceId = req.headers['x-device-id'];
  
  if (!deviceId) {
    throw new ValidationError('X-Device-ID header is required');
  }
  
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(deviceId)) {
    throw new ValidationError('X-Device-ID must be a valid UUID');
  }
  
  req.deviceId = deviceId;
  next();
}

module.exports = {
  validate,
  requireDeviceId
};

