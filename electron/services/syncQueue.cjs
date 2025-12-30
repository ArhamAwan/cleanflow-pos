/**
 * Sync Queue Service
 * 
 * Manages local queue for records that failed to sync due to missing dependencies.
 * Records are retried when dependencies become available.
 */

const { getDatabase, getDeviceId, getCurrentTimestamp } = require('../db/database.cjs');
const { v4: uuidv4 } = require('uuid');

// Create queue table if not exists
function initializeQueueTable() {
  const db = getDatabase();
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS local_sync_queue (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      record_data TEXT NOT NULL,
      missing_dependencies TEXT,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 10,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
      error_message TEXT,
      created_at TEXT NOT NULL,
      last_retry_at TEXT,
      UNIQUE(table_name, record_id)
    )
  `);
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_local_sync_queue_status ON local_sync_queue(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_local_sync_queue_table ON local_sync_queue(table_name)');
}

/**
 * Add a record to the sync queue
 */
function queueRecord(tableName, recordId, recordData, missingDependencies = null) {
  const db = getDatabase();
  initializeQueueTable();
  
  const id = uuidv4();
  const now = getCurrentTimestamp();
  
  try {
    db.prepare(`
      INSERT INTO local_sync_queue (id, table_name, record_id, record_data, missing_dependencies, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(table_name, record_id) DO UPDATE SET
        record_data = excluded.record_data,
        missing_dependencies = excluded.missing_dependencies,
        retry_count = local_sync_queue.retry_count + 1,
        last_retry_at = excluded.created_at,
        status = 'PENDING'
    `).run(
      id,
      tableName,
      recordId,
      JSON.stringify(recordData),
      missingDependencies ? JSON.stringify(missingDependencies) : null,
      now
    );
    
    return { success: true, id };
  } catch (error) {
    console.error('Failed to queue record:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get pending queue items
 */
function getPendingItems(tableName = null, limit = 100) {
  const db = getDatabase();
  initializeQueueTable();
  
  let query = `
    SELECT * FROM local_sync_queue
    WHERE status = 'PENDING' AND retry_count < max_retries
  `;
  const params = [];
  
  if (tableName) {
    query += ' AND table_name = ?';
    params.push(tableName);
  }
  
  query += ' ORDER BY created_at ASC LIMIT ?';
  params.push(limit);
  
  const items = db.prepare(query).all(...params);
  
  return items.map(item => ({
    ...item,
    recordData: JSON.parse(item.record_data),
    missingDependencies: item.missing_dependencies ? JSON.parse(item.missing_dependencies) : null
  }));
}

/**
 * Mark queue item as completed
 */
function markCompleted(id) {
  const db = getDatabase();
  
  db.prepare(`
    UPDATE local_sync_queue SET status = 'COMPLETED' WHERE id = ?
  `).run(id);
}

/**
 * Mark queue item as failed
 */
function markFailed(id, errorMessage = null) {
  const db = getDatabase();
  
  db.prepare(`
    UPDATE local_sync_queue 
    SET status = CASE WHEN retry_count >= max_retries THEN 'FAILED' ELSE 'PENDING' END,
        retry_count = retry_count + 1,
        error_message = ?,
        last_retry_at = datetime('now')
    WHERE id = ?
  `).run(errorMessage, id);
}

/**
 * Get queue statistics
 */
function getQueueStats() {
  const db = getDatabase();
  initializeQueueTable();
  
  const stats = db.prepare(`
    SELECT 
      table_name,
      status,
      COUNT(*) as count
    FROM local_sync_queue
    GROUP BY table_name, status
  `).all();
  
  const result = {
    byTable: {},
    byStatus: { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0 },
    total: 0
  };
  
  for (const row of stats) {
    if (!result.byTable[row.table_name]) {
      result.byTable[row.table_name] = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0 };
    }
    result.byTable[row.table_name][row.status] = row.count;
    result.byStatus[row.status] += row.count;
    result.total += row.count;
  }
  
  return result;
}

/**
 * Clean up completed items older than specified days
 */
function cleanupCompleted(daysOld = 7) {
  const db = getDatabase();
  initializeQueueTable();
  
  const result = db.prepare(`
    DELETE FROM local_sync_queue
    WHERE status = 'COMPLETED'
    AND datetime(created_at) < datetime('now', '-' || ? || ' days')
  `).run(daysOld);
  
  return { deleted: result.changes };
}

/**
 * Reset failed items back to pending for retry
 */
function resetFailedItems(tableName = null) {
  const db = getDatabase();
  initializeQueueTable();
  
  let query = `
    UPDATE local_sync_queue
    SET status = 'PENDING', retry_count = 0, error_message = NULL
    WHERE status = 'FAILED'
  `;
  const params = [];
  
  if (tableName) {
    query += ' AND table_name = ?';
    params.push(tableName);
  }
  
  const result = db.prepare(query).run(...params);
  return { reset: result.changes };
}

/**
 * Check if dependencies exist locally
 */
function checkDependenciesExist(tableName, recordData) {
  const db = getDatabase();
  
  const dependencyFields = {
    jobs: { customer_id: 'customers', service_id: 'service_types' },
    payments: { customer_id: 'customers', job_id: 'jobs' },
    ledger_entries: { customer_id: 'customers' }
  };
  
  const deps = dependencyFields[tableName];
  if (!deps) return { allExist: true, missing: {} };
  
  const missing = {};
  
  for (const [field, depTable] of Object.entries(deps)) {
    const depId = recordData[field] || recordData[field.replace(/_/g, '')]; // Handle camelCase
    
    if (depId) {
      const exists = db.prepare(`SELECT 1 FROM ${depTable} WHERE id = ?`).get(depId);
      
      if (!exists) {
        if (!missing[depTable]) missing[depTable] = [];
        missing[depTable].push(depId);
      }
    }
  }
  
  return {
    allExist: Object.keys(missing).length === 0,
    missing
  };
}

module.exports = {
  initializeQueueTable,
  queueRecord,
  getPendingItems,
  markCompleted,
  markFailed,
  getQueueStats,
  cleanupCompleted,
  resetFailedItems,
  checkDependenciesExist
};

