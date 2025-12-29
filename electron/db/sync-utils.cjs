const { getDatabase, getDeviceId } = require('./database.cjs');

/**
 * Sync Utilities
 * Helper functions for querying and managing sync status
 * These functions are used by sync logic to identify records that need syncing
 */

/**
 * Get all pending records for a specific table
 * @param {string} tableName - Name of the table
 * @param {number} limit - Maximum number of records to return (default: 1000)
 * @returns {Array} Array of records with sync_status = 'PENDING'
 */
function getPendingRecords(tableName, limit = 1000) {
  const db = getDatabase();
  const deviceId = getDeviceId();
  
  // Validate table name to prevent SQL injection
  const validTables = [
    'customers',
    'jobs',
    'payments',
    'expenses',
    'service_types',
    'users',
    'ledger_entries',
    'audit_logs'
  ];
  
  if (!validTables.includes(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  
  const query = `
    SELECT * FROM ${tableName}
    WHERE device_id = ? AND sync_status = 'PENDING'
    ORDER BY created_at ASC
    LIMIT ?
  `;
  
  return db.prepare(query).all(deviceId, limit);
}

/**
 * Get count of pending records for a specific table
 * @param {string} tableName - Name of the table
 * @returns {number} Count of pending records
 */
function getPendingCount(tableName) {
  const db = getDatabase();
  const deviceId = getDeviceId();
  
  const validTables = [
    'customers',
    'jobs',
    'payments',
    'expenses',
    'service_types',
    'users',
    'ledger_entries',
    'audit_logs'
  ];
  
  if (!validTables.includes(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  
  const query = `
    SELECT COUNT(*) as count FROM ${tableName}
    WHERE device_id = ? AND sync_status = 'PENDING'
  `;
  
  const result = db.prepare(query).get(deviceId);
  return result?.count || 0;
}

/**
 * Get all pending records across all tables
 * @param {number} limitPerTable - Maximum records per table (default: 1000)
 * @returns {Object} Object with table names as keys and arrays of records as values
 */
function getAllPendingRecords(limitPerTable = 1000) {
  const tables = [
    'customers',
    'jobs',
    'payments',
    'expenses',
    'service_types',
    'users',
    'ledger_entries',
    'audit_logs'
  ];
  
  const result = {};
  
  for (const table of tables) {
    result[table] = getPendingRecords(table, limitPerTable);
  }
  
  return result;
}

/**
 * Get total count of all pending records across all tables
 * @returns {number} Total count of pending records
 */
function getTotalPendingCount() {
  const tables = [
    'customers',
    'jobs',
    'payments',
    'expenses',
    'service_types',
    'users',
    'ledger_entries',
    'audit_logs'
  ];
  
  let total = 0;
  
  for (const table of tables) {
    total += getPendingCount(table);
  }
  
  return total;
}

/**
 * Mark a record as synced
 * @param {string} tableName - Name of the table
 * @param {string} recordId - ID of the record
 * @returns {boolean} True if successful
 */
function markAsSynced(tableName, recordId) {
  const db = getDatabase();
  const deviceId = getDeviceId();
  
  const validTables = [
    'customers',
    'jobs',
    'payments',
    'expenses',
    'service_types',
    'users',
    'ledger_entries',
    'audit_logs'
  ];
  
  if (!validTables.includes(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  
  const query = `
    UPDATE ${tableName}
    SET sync_status = 'SYNCED'
    WHERE id = ? AND device_id = ?
  `;
  
  const result = db.prepare(query).run(recordId, deviceId);
  return result.changes > 0;
}

/**
 * Mark a record as failed sync
 * @param {string} tableName - Name of the table
 * @param {string} recordId - ID of the record
 * @returns {boolean} True if successful
 */
function markAsFailed(tableName, recordId) {
  const db = getDatabase();
  const deviceId = getDeviceId();
  
  const validTables = [
    'customers',
    'jobs',
    'payments',
    'expenses',
    'service_types',
    'users',
    'ledger_entries',
    'audit_logs'
  ];
  
  if (!validTables.includes(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  
  const query = `
    UPDATE ${tableName}
    SET sync_status = 'FAILED'
    WHERE id = ? AND device_id = ?
  `;
  
  const result = db.prepare(query).run(recordId, deviceId);
  return result.changes > 0;
}

/**
 * Mark multiple records as synced (batch operation)
 * @param {string} tableName - Name of the table
 * @param {Array<string>} recordIds - Array of record IDs
 * @returns {number} Number of records marked as synced
 */
function markMultipleAsSynced(tableName, recordIds) {
  if (!recordIds || recordIds.length === 0) {
    return 0;
  }
  
  const db = getDatabase();
  const deviceId = getDeviceId();
  
  const validTables = [
    'customers',
    'jobs',
    'payments',
    'expenses',
    'service_types',
    'users',
    'ledger_entries',
    'audit_logs'
  ];
  
  if (!validTables.includes(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  
  // Use a transaction for batch update
  const update = db.prepare(`
    UPDATE ${tableName}
    SET sync_status = 'SYNCED'
    WHERE id = ? AND device_id = ?
  `);
  
  const markMany = db.transaction((ids) => {
    let count = 0;
    for (const id of ids) {
      const result = update.run(id, deviceId);
      if (result.changes > 0) {
        count++;
      }
    }
    return count;
  });
  
  return markMany(recordIds);
}

/**
 * Reset failed records back to pending (for retry)
 * @param {string} tableName - Name of the table
 * @returns {number} Number of records reset
 */
function resetFailedRecords(tableName) {
  const db = getDatabase();
  const deviceId = getDeviceId();
  
  const validTables = [
    'customers',
    'jobs',
    'payments',
    'expenses',
    'service_types',
    'users',
    'ledger_entries',
    'audit_logs'
  ];
  
  if (!validTables.includes(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  
  const query = `
    UPDATE ${tableName}
    SET sync_status = 'PENDING'
    WHERE device_id = ? AND sync_status = 'FAILED'
  `;
  
  const result = db.prepare(query).run(deviceId);
  return result.changes;
}

/**
 * Get sync statistics for all tables
 * @returns {Object} Object with sync statistics per table
 */
function getSyncStatistics() {
  const db = getDatabase();
  const deviceId = getDeviceId();
  
  const tables = [
    'customers',
    'jobs',
    'payments',
    'expenses',
    'service_types',
    'users',
    'ledger_entries',
    'audit_logs'
  ];
  
  const stats = {};
  
  for (const table of tables) {
    const query = `
      SELECT 
        sync_status,
        COUNT(*) as count
      FROM ${table}
      WHERE device_id = ?
      GROUP BY sync_status
    `;
    
    const results = db.prepare(query).all(deviceId);
    
    stats[table] = {
      PENDING: 0,
      SYNCED: 0,
      FAILED: 0,
      TOTAL: 0
    };
    
    for (const row of results) {
      stats[table][row.sync_status] = row.count;
      stats[table].TOTAL += row.count;
    }
  }
  
  return stats;
}

module.exports = {
  getPendingRecords,
  getPendingCount,
  getAllPendingRecords,
  getTotalPendingCount,
  markAsSynced,
  markAsFailed,
  markMultipleAsSynced,
  resetFailedRecords,
  getSyncStatistics,
};

