const { v4: uuidv4 } = require('uuid');
const { getDatabase, getDeviceId, getCurrentTimestamp } = require('../db/database.cjs');

/**
 * Audit Service
 * Logs all data changes for audit trail
 * Every CREATE, UPDATE, DELETE operation should be logged
 */

/**
 * Create an audit log entry
 * @param {Object} params - Audit parameters
 * @param {string} params.action - CREATE | UPDATE | DELETE
 * @param {string} params.tableName - Name of the table
 * @param {string} params.recordId - ID of the affected record
 * @param {Object|null} params.oldValue - Previous value (for UPDATE/DELETE)
 * @param {Object|null} params.newValue - New value (for CREATE/UPDATE)
 * @param {string|null} params.userId - User who made the change
 * @param {Object} [db] - Database instance (for transactions)
 * @returns {Object} Created audit log
 */
function createAuditLog({ action, tableName, recordId, oldValue, newValue, userId }, db = null) {
  const database = db || getDatabase();
  const deviceId = getDeviceId();
  const now = getCurrentTimestamp();
  const id = uuidv4();
  
  const stmt = database.prepare(`
    INSERT INTO audit_logs (
      id, action, table_name, record_id, old_value, new_value, 
      user_id, created_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `);
  
  stmt.run(
    id,
    action,
    tableName,
    recordId,
    oldValue ? JSON.stringify(oldValue) : null,
    newValue ? JSON.stringify(newValue) : null,
    userId,
    now,
    deviceId
  );
  
  return {
    id,
    action,
    tableName,
    recordId,
    oldValue,
    newValue,
    userId,
    createdAt: now,
    syncStatus: 'PENDING',
    deviceId,
  };
}

/**
 * Get audit logs for a specific record
 * @param {string} tableName - Name of the table
 * @param {string} recordId - ID of the record
 * @returns {Array} Audit logs
 */
function getAuditLogsForRecord(tableName, recordId) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM audit_logs 
    WHERE table_name = ? AND record_id = ?
    ORDER BY created_at DESC
  `);
  
  return stmt.all(tableName, recordId);
}

/**
 * Get audit logs by date range
 * @param {string} startDate - Start date (ISO format)
 * @param {string} endDate - End date (ISO format)
 * @returns {Array} Audit logs
 */
function getAuditLogsByDateRange(startDate, endDate) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM audit_logs 
    WHERE created_at >= ? AND created_at <= ?
    ORDER BY created_at DESC
  `);
  
  return stmt.all(startDate, endDate);
}

/**
 * Get recent audit logs
 * @param {number} limit - Number of logs to retrieve
 * @returns {Array} Audit logs
 */
function getRecentAuditLogs(limit = 100) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM audit_logs 
    ORDER BY created_at DESC
    LIMIT ?
  `);
  
  return stmt.all(limit);
}

module.exports = {
  createAuditLog,
  getAuditLogsForRecord,
  getAuditLogsByDateRange,
  getRecentAuditLogs,
};
