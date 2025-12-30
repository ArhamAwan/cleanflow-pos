/**
 * Clock Skew Detection Middleware
 * 
 * Detects if client clock is significantly different from server clock.
 * Adds warning headers and logs potential issues.
 */

const logger = require('../config/logger');

// Maximum allowed clock difference (5 minutes)
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

function clockSkewMiddleware(req, res, next) {
  const clientTimestamp = req.headers['x-client-timestamp'];
  
  if (clientTimestamp) {
    const clientTime = new Date(clientTimestamp);
    const serverTime = new Date();
    const skew = Math.abs(serverTime.getTime() - clientTime.getTime());
    
    // Store server timestamp in request for later use
    req.serverTimestamp = serverTime.toISOString();
    
    if (skew > MAX_CLOCK_SKEW_MS) {
      const skewMinutes = Math.round(skew / 60000);
      const direction = clientTime > serverTime ? 'ahead' : 'behind';
      
      logger.warn('Clock skew detected', {
        deviceId: req.headers['x-device-id'],
        skewMinutes,
        direction,
        clientTime: clientTimestamp,
        serverTime: serverTime.toISOString()
      });
      
      // Add warning header
      res.setHeader('X-Clock-Skew-Warning', `Client clock is ${skewMinutes} minutes ${direction}`);
      res.setHeader('X-Server-Timestamp', serverTime.toISOString());
    }
  } else {
    req.serverTimestamp = new Date().toISOString();
  }
  
  // Always add server timestamp header
  res.setHeader('X-Server-Timestamp', req.serverTimestamp);
  
  next();
}

module.exports = clockSkewMiddleware;

