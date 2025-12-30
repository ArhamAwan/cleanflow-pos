/**
 * Sync Routes
 * 
 * Handles upload and download of sync data between devices.
 */

const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const { validate, requireDeviceId } = require('../middleware/validator');
const syncService = require('../services/syncService');
const { isValidTable, SYNC_ORDER } = require('../config/syncOrder');
const logger = require('../config/logger');

// All sync routes require device ID
router.use(requireDeviceId);

/**
 * POST /api/sync/upload
 * Upload pending records from a device
 */
router.post('/upload',
  [
    body('tableName').isString().custom(value => {
      if (!isValidTable(value)) {
        throw new Error(`Invalid table name: ${value}. Valid tables: ${SYNC_ORDER.join(', ')}`);
      }
      return true;
    }),
    body('records').isArray({ min: 1, max: 1000 }).withMessage('Records must be an array with 1-1000 items'),
    validate
  ],
  async (req, res, next) => {
    try {
      const { tableName, records } = req.body;
      const deviceId = req.deviceId;
      
      logger.info(`Upload request: ${records.length} ${tableName} records from device ${deviceId}`);
      
      const result = await syncService.uploadRecords(deviceId, tableName, records);
      
      res.json({
        success: true,
        ...result,
        serverTimestamp: req.serverTimestamp
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/sync/download
 * Download records from other devices
 */
router.get('/download',
  [
    query('tableName').isString().custom(value => {
      if (!isValidTable(value)) {
        throw new Error(`Invalid table name: ${value}`);
      }
      return true;
    }),
    query('since').optional().isISO8601().withMessage('since must be ISO8601 timestamp'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).toInt(),
    query('cursor').optional().isISO8601(),
    validate
  ],
  async (req, res, next) => {
    try {
      const { tableName, since, limit = 500, cursor } = req.query;
      const deviceId = req.deviceId;
      
      logger.info(`Download request: ${tableName} for device ${deviceId}, since: ${since || 'beginning'}`);
      
      const result = await syncService.downloadRecords(deviceId, tableName, {
        since: since ? new Date(since) : null,
        limit: parseInt(limit),
        cursor: cursor ? new Date(cursor) : null
      });
      
      res.json({
        success: true,
        ...result,
        serverTimestamp: req.serverTimestamp
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/sync/batch-upload
 * Upload records from multiple tables in order
 */
router.post('/batch-upload',
  [
    body('tables').isObject().withMessage('tables must be an object with table names as keys'),
    validate
  ],
  async (req, res, next) => {
    try {
      const { tables } = req.body;
      const deviceId = req.deviceId;
      
      // Validate all table names
      for (const tableName of Object.keys(tables)) {
        if (!isValidTable(tableName)) {
          return res.status(400).json({
            success: false,
            error: `Invalid table name: ${tableName}`
          });
        }
      }
      
      const result = await syncService.batchUpload(deviceId, tables);
      
      res.json({
        success: true,
        ...result,
        serverTimestamp: req.serverTimestamp
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/sync/batch-download
 * Download records from multiple tables for a device
 */
router.get('/batch-download',
  [
    query('tables').optional().isString().withMessage('tables should be comma-separated list'),
    query('since').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 500 }).toInt(),
    validate
  ],
  async (req, res, next) => {
    try {
      const { tables: tablesParam, since, limit = 100 } = req.query;
      const deviceId = req.deviceId;
      
      // Parse tables or use all
      let tables = tablesParam ? tablesParam.split(',') : SYNC_ORDER;
      
      // Validate table names
      tables = tables.filter(t => isValidTable(t.trim()));
      
      const result = await syncService.batchDownload(deviceId, tables, {
        since: since ? new Date(since) : null,
        limit: parseInt(limit)
      });
      
      res.json({
        success: true,
        ...result,
        serverTimestamp: req.serverTimestamp
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/sync/status
 * Get sync status for a device
 */
router.get('/status', async (req, res, next) => {
  try {
    const deviceId = req.deviceId;
    
    const status = await syncService.getDeviceStatus(deviceId);
    
    res.json({
      success: true,
      ...status,
      serverTimestamp: req.serverTimestamp
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sync/queue
 * Get pending queue items for a device
 */
router.get('/queue', async (req, res, next) => {
  try {
    const deviceId = req.deviceId;
    
    const queue = await syncService.getQueueStatus(deviceId);
    
    res.json({
      success: true,
      ...queue,
      serverTimestamp: req.serverTimestamp
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sync/queue/process
 * Process queued items for a device
 */
router.post('/queue/process', async (req, res, next) => {
  try {
    const deviceId = req.deviceId;
    const limit = parseInt(req.query.limit) || 100;
    
    const result = await syncService.processQueue(deviceId, limit);
    
    res.json({
      success: true,
      ...result,
      serverTimestamp: req.serverTimestamp
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sync/conflicts
 * Get recent conflicts for a device
 */
router.get('/conflicts',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('since').optional().isISO8601(),
    validate
  ],
  async (req, res, next) => {
    try {
      const deviceId = req.deviceId;
      const { limit = 50, since } = req.query;
      
      const conflicts = await syncService.getConflicts(deviceId, {
        limit: parseInt(limit),
        since: since ? new Date(since) : null
      });
      
      res.json({
        success: true,
        conflicts,
        serverTimestamp: req.serverTimestamp
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

