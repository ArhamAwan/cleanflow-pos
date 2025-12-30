/**
 * Health Check Routes
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

/**
 * GET /api/health
 * Basic health check
 */
router.get('/', async (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /api/health/db
 * Database health check
 */
router.get('/db', async (req, res, next) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as server_time, current_database() as database');
    client.release();
    
    res.json({
      success: true,
      status: 'connected',
      database: result.rows[0].database,
      serverTime: result.rows[0].server_time,
      poolSize: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/health/stats
 * Server statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const client = await pool.connect();
    
    // Get table counts
    const tableCountsResult = await client.query(`
      SELECT 
        'customers' as table_name, COUNT(*) as count FROM customers
      UNION ALL
      SELECT 'jobs', COUNT(*) FROM jobs
      UNION ALL
      SELECT 'payments', COUNT(*) FROM payments
      UNION ALL
      SELECT 'expenses', COUNT(*) FROM expenses
      UNION ALL
      SELECT 'users', COUNT(*) FROM users
      UNION ALL
      SELECT 'service_types', COUNT(*) FROM service_types
      UNION ALL
      SELECT 'ledger_entries', COUNT(*) FROM ledger_entries
      UNION ALL
      SELECT 'audit_logs', COUNT(*) FROM audit_logs
    `);
    
    // Get device count
    const deviceCountResult = await client.query(`
      SELECT COUNT(DISTINCT id) as count FROM devices
    `);
    
    // Get sync queue stats
    const queueStatsResult = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM sync_queue
      GROUP BY status
    `);
    
    // Get recent conflicts
    const conflictsResult = await client.query(`
      SELECT 
        conflict_type,
        COUNT(*) as count
      FROM sync_conflicts
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY conflict_type
    `);
    
    client.release();
    
    const tableCounts = {};
    for (const row of tableCountsResult.rows) {
      tableCounts[row.table_name] = parseInt(row.count);
    }
    
    const queueStats = {};
    for (const row of queueStatsResult.rows) {
      queueStats[row.status.toLowerCase()] = parseInt(row.count);
    }
    
    const conflicts24h = {};
    for (const row of conflictsResult.rows) {
      conflicts24h[row.conflict_type] = parseInt(row.count);
    }
    
    res.json({
      success: true,
      stats: {
        tables: tableCounts,
        devices: parseInt(deviceCountResult.rows[0].count),
        syncQueue: queueStats,
        conflicts24h
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

