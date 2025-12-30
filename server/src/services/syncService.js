/**
 * Sync Service
 * 
 * Handles all sync operations including upload, download, and queue management.
 */

const { query, withTransaction } = require('../config/database');
const { SYNC_ORDER, getDependencyFields } = require('../config/syncOrder');
const logger = require('../config/logger');

const BATCH_SIZE = parseInt(process.env.SYNC_BATCH_SIZE) || 500;

/**
 * Upload records from a device
 * @param {string} deviceId - Device ID
 * @param {string} tableName - Table name
 * @param {Array} records - Array of records to upload
 * @returns {Object} Upload result
 */
async function uploadRecords(deviceId, tableName, records) {
  const results = {
    synced: [],
    skipped: [],
    failed: [],
    queued: []
  };
  
  // Register device
  await registerDevice(deviceId);
  
  // Process each record
  for (const record of records) {
    try {
      const syncResult = await syncRecord(tableName, record);
      
      if (syncResult.action === 'INSERTED' || syncResult.action === 'UPDATED') {
        results.synced.push({
          recordId: syncResult.recordId,
          action: syncResult.action,
          serverUpdatedAt: syncResult.serverUpdatedAt
        });
      } else if (syncResult.action === 'QUEUED') {
        results.queued.push({
          recordId: syncResult.recordId,
          missingDependencies: syncResult.missingDependencies
        });
      } else {
        results.skipped.push({
          recordId: syncResult.recordId,
          reason: 'OLDER_TIMESTAMP'
        });
      }
    } catch (error) {
      logger.error(`Failed to sync ${tableName} record ${record.id}:`, error);
      results.failed.push({
        recordId: record.id,
        error: error.message
      });
    }
  }
  
  // Log sync operation
  await logSyncOperation(deviceId, tableName, records.length, 'UPLOAD', 
    results.failed.length === 0 ? 'SUCCESS' : 
    results.synced.length > 0 ? 'PARTIAL' : 'FAILED');
  
  return {
    tableName,
    total: records.length,
    syncedCount: results.synced.length,
    skippedCount: results.skipped.length,
    queuedCount: results.queued.length,
    failedCount: results.failed.length,
    ...results
  };
}

/**
 * Sync a single record using the appropriate v2 function
 */
async function syncRecord(tableName, record) {
  const syncFunctions = {
    customers: 'sync_customer_v2',
    jobs: 'sync_job_v2',
    payments: 'sync_payment_v2',
    expenses: 'sync_expense_v2',
    service_types: 'sync_service_type_v2',
    users: 'sync_user_v2',
    ledger_entries: 'sync_ledger_entry_v2',
    audit_logs: 'sync_audit_log_v2'
  };
  
  const funcName = syncFunctions[tableName];
  if (!funcName) {
    throw new Error(`Unknown table: ${tableName}`);
  }
  
  // Build parameters based on table
  const params = buildSyncParams(tableName, record);
  const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');
  
  const result = await query(
    `SELECT ${funcName}(${placeholders}) as result`,
    params
  );
  
  return result.rows[0].result;
}

/**
 * Build sync function parameters based on table
 */
function buildSyncParams(tableName, record) {
  const paramMaps = {
    customers: ['id', 'device_id', 'name', 'phone', 'address', 'outstanding_balance', 'created_at', 'updated_at', 'sync_status'],
    jobs: ['id', 'device_id', 'customer_id', 'service_id', 'date', 'amount', 'payment_status', 'paid_amount', 'notes', 'created_at', 'updated_at', 'sync_status'],
    payments: ['id', 'device_id', 'type', 'amount', 'method', 'customer_id', 'job_id', 'description', 'date', 'created_at', 'updated_at', 'sync_status'],
    expenses: ['id', 'device_id', 'category', 'amount', 'description', 'method', 'date', 'created_at', 'updated_at', 'sync_status'],
    service_types: ['id', 'device_id', 'name', 'description', 'price', 'is_active', 'created_at', 'updated_at', 'sync_status'],
    users: ['id', 'device_id', 'name', 'email', 'password_hash', 'role', 'is_active', 'created_at', 'updated_at', 'sync_status'],
    ledger_entries: ['id', 'device_id', 'entry_type', 'reference_type', 'reference_id', 'customer_id', 'description', 'debit', 'credit', 'balance', 'date', 'created_at', 'updated_at', 'sync_status'],
    audit_logs: ['id', 'device_id', 'action', 'table_name', 'record_id', 'old_value', 'new_value', 'user_id', 'created_at', 'sync_status']
  };
  
  const fields = paramMaps[tableName];
  if (!fields) {
    throw new Error(`Unknown table: ${tableName}`);
  }
  
  // Convert camelCase to snake_case for field lookup
  return fields.map(field => {
    const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    return record[camelField] !== undefined ? record[camelField] : record[field];
  });
}

/**
 * Download records for a device from other devices
 * @param {string} deviceId - Device ID
 * @param {string} tableName - Table name
 * @param {Object} options - Download options
 * @returns {Object} Download result
 */
async function downloadRecords(deviceId, tableName, options = {}) {
  const { since, limit = BATCH_SIZE, cursor } = options;
  
  let queryText = `
    SELECT row_to_json(t)::jsonb as data, server_updated_at
    FROM ${tableName} t
    WHERE device_id != $1
  `;
  const params = [deviceId];
  
  if (since) {
    params.push(since);
    queryText += ` AND server_updated_at > $${params.length}`;
  }
  
  if (cursor) {
    params.push(cursor);
    queryText += ` AND server_updated_at > $${params.length}`;
  }
  
  queryText += ` ORDER BY server_updated_at ASC LIMIT $${params.length + 1}`;
  params.push(limit + 1); // Get one extra to check if there are more
  
  const result = await query(queryText, params);
  
  const hasMore = result.rows.length > limit;
  const records = hasMore ? result.rows.slice(0, -1) : result.rows;
  
  const lastRecord = records[records.length - 1];
  const nextCursor = hasMore && lastRecord ? lastRecord.server_updated_at : null;
  
  return {
    tableName,
    records: records.map(r => r.data),
    count: records.length,
    hasMore,
    nextCursor
  };
}

/**
 * Batch upload from multiple tables
 */
async function batchUpload(deviceId, tables) {
  const results = {};
  let totalSynced = 0;
  let totalFailed = 0;
  
  // Process tables in sync order
  for (const tableName of SYNC_ORDER) {
    if (tables[tableName] && Array.isArray(tables[tableName])) {
      const result = await uploadRecords(deviceId, tableName, tables[tableName]);
      results[tableName] = result;
      totalSynced += result.syncedCount;
      totalFailed += result.failedCount;
    }
  }
  
  return {
    results,
    totalSynced,
    totalFailed,
    tablesProcessed: Object.keys(results).length
  };
}

/**
 * Batch download from multiple tables
 */
async function batchDownload(deviceId, tables, options = {}) {
  const { since, limit = 100 } = options;
  const results = {};
  let totalRecords = 0;
  
  for (const tableName of tables) {
    const result = await downloadRecords(deviceId, tableName, { since, limit });
    results[tableName] = result;
    totalRecords += result.count;
  }
  
  return {
    results,
    totalRecords,
    tablesProcessed: tables.length
  };
}

/**
 * Get device sync status
 */
async function getDeviceStatus(deviceId) {
  // Get device info
  const deviceResult = await query(
    'SELECT * FROM devices WHERE id = $1',
    [deviceId]
  );
  
  // Get pending counts per table
  const pendingCounts = {};
  for (const tableName of SYNC_ORDER) {
    const countResult = await query(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE device_id = $1 AND sync_status = 'PENDING'`,
      [deviceId]
    );
    pendingCounts[tableName] = parseInt(countResult.rows[0].count);
  }
  
  // Get recent sync operations
  const recentOps = await query(
    `SELECT * FROM sync_operations 
     WHERE device_id = $1 
     ORDER BY created_at DESC 
     LIMIT 10`,
    [deviceId]
  );
  
  return {
    device: deviceResult.rows[0] || null,
    pendingCounts,
    totalPending: Object.values(pendingCounts).reduce((a, b) => a + b, 0),
    recentOperations: recentOps.rows
  };
}

/**
 * Get queue status for a device
 */
async function getQueueStatus(deviceId) {
  const result = await query(
    `SELECT 
      status,
      table_name,
      COUNT(*) as count
     FROM sync_queue
     WHERE device_id = $1
     GROUP BY status, table_name
     ORDER BY table_name, status`,
    [deviceId]
  );
  
  const byTable = {};
  const byStatus = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0 };
  
  for (const row of result.rows) {
    if (!byTable[row.table_name]) {
      byTable[row.table_name] = {};
    }
    byTable[row.table_name][row.status] = parseInt(row.count);
    byStatus[row.status] += parseInt(row.count);
  }
  
  return {
    byTable,
    byStatus,
    totalQueued: byStatus.PENDING + byStatus.PROCESSING
  };
}

/**
 * Process queued items
 */
async function processQueue(deviceId, limit = 100) {
  const result = await query(
    'SELECT process_sync_queue($1, $2) as result',
    [deviceId, limit]
  );
  
  return result.rows[0].result;
}

/**
 * Get recent conflicts for a device
 */
async function getConflicts(deviceId, options = {}) {
  const { limit = 50, since } = options;
  
  let queryText = `
    SELECT * FROM sync_conflicts
    WHERE device_id = $1
  `;
  const params = [deviceId];
  
  if (since) {
    params.push(since);
    queryText += ` AND created_at > $${params.length}`;
  }
  
  queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);
  
  const result = await query(queryText, params);
  
  return result.rows;
}

/**
 * Register or update a device
 */
async function registerDevice(deviceId, name = null) {
  await query(
    'SELECT register_device($1, $2)',
    [deviceId, name]
  );
}

/**
 * Log a sync operation
 */
async function logSyncOperation(deviceId, tableName, recordCount, syncType, status, errorMessage = null) {
  await query(
    `INSERT INTO sync_operations (device_id, table_name, record_count, sync_type, status, error_message, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [deviceId, tableName, recordCount, syncType, status, errorMessage]
  );
}

module.exports = {
  uploadRecords,
  downloadRecords,
  batchUpload,
  batchDownload,
  getDeviceStatus,
  getQueueStatus,
  processQueue,
  getConflicts,
  registerDevice
};

