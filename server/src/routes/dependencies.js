/**
 * Dependencies Routes
 * 
 * Handles fetching dependencies for records.
 */

const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { validate, requireDeviceId } = require('../middleware/validator');
const dependencyService = require('../services/dependencyService');
const { isValidTable, getDependencies } = require('../config/syncOrder');
const logger = require('../config/logger');

// All routes require device ID
router.use(requireDeviceId);

/**
 * POST /api/dependencies/fetch
 * Fetch dependencies for a list of record IDs
 */
router.post('/fetch',
  [
    body('tableName').isString().custom(value => {
      if (!isValidTable(value)) {
        throw new Error(`Invalid table name: ${value}`);
      }
      return true;
    }),
    body('recordIds').isArray({ min: 1, max: 100 }).withMessage('recordIds must be an array with 1-100 items'),
    body('recordIds.*').isString().withMessage('Each recordId must be a string'),
    validate
  ],
  async (req, res, next) => {
    try {
      const { tableName, recordIds } = req.body;
      const deviceId = req.deviceId;
      
      logger.info(`Dependency fetch: ${recordIds.length} ${tableName} records for device ${deviceId}`);
      
      const dependencies = await dependencyService.fetchDependencies(tableName, recordIds);
      
      res.json({
        success: true,
        dependencies,
        serverTimestamp: req.serverTimestamp
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/dependencies/check
 * Check if dependencies exist for a table
 */
router.get('/check',
  [
    query('tableName').isString().custom(value => {
      if (!isValidTable(value)) {
        throw new Error(`Invalid table name: ${value}`);
      }
      return true;
    }),
    query('ids').isString().withMessage('ids should be comma-separated list'),
    validate
  ],
  async (req, res, next) => {
    try {
      const { tableName, ids: idsParam } = req.query;
      const recordIds = idsParam.split(',').map(id => id.trim());
      
      const missing = await dependencyService.checkMissingDependencies(tableName, recordIds);
      
      res.json({
        success: true,
        tableName,
        recordIds,
        missing,
        allDependenciesExist: Object.keys(missing).length === 0,
        serverTimestamp: req.serverTimestamp
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/dependencies/info
 * Get dependency information for a table
 */
router.get('/info/:tableName', async (req, res, next) => {
  try {
    const { tableName } = req.params;
    
    if (!isValidTable(tableName)) {
      return res.status(400).json({
        success: false,
        error: `Invalid table name: ${tableName}`
      });
    }
    
    const deps = getDependencies(tableName);
    
    res.json({
      success: true,
      tableName,
      dependencies: deps,
      hasDependencies: deps.length > 0
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

