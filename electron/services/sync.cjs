/**
 * Sync Service
 *
 * Handles synchronization between local SQLite and remote PostgreSQL server.
 * Features:
 * - Upload pending records to server
 * - Download records from other devices
 * - Handle dependencies in correct order
 * - Queue records with missing dependencies
 * - Retry failed syncs with exponential backoff
 */

const {
  getDatabase,
  getDeviceId,
  getCurrentTimestamp,
} = require("../db/database.cjs");
const {
  getPendingRecords,
  markAsSynced,
  markAsFailed,
  getSyncStatistics,
} = require("../db/sync-utils.cjs");

// Sync configuration
const SYNC_CONFIG = {
  serverUrl: process.env.SYNC_SERVER_URL || "http://localhost:3001",
  batchSize: 500,
  maxRetries: 5,
  retryDelays: [1000, 2000, 4000, 8000, 16000], // Exponential backoff
  timeout: 30000,
};

// Sync order (dependency tiers)
const SYNC_ORDER = {
  tier1: ["users", "customers", "service_types", "expenses"],
  tier2: ["jobs"],
  tier3: ["payments"],
  tier4: ["ledger_entries"],
  tier5: ["audit_logs"],
};

// All tables in order
const ALL_TABLES = [
  ...SYNC_ORDER.tier1,
  ...SYNC_ORDER.tier2,
  ...SYNC_ORDER.tier3,
  ...SYNC_ORDER.tier4,
  ...SYNC_ORDER.tier5,
];

// Sync state
let isSyncing = false;
let lastSyncAt = null;
let syncProgress = null;

/**
 * Make HTTP request to sync server
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SYNC_CONFIG.timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Device-ID": getDeviceId(),
        "X-Client-Timestamp": new Date().toISOString(),
        ...options.headers,
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * Upload pending records for a table
 */
async function uploadTable(tableName) {
  const records = getPendingRecords(tableName, SYNC_CONFIG.batchSize);

  if (records.length === 0) {
    return { tableName, uploaded: 0, synced: 0, failed: 0 };
  }

  try {
    const result = await fetchWithTimeout(
      `${SYNC_CONFIG.serverUrl}/api/sync/upload`,
      {
        method: "POST",
        body: JSON.stringify({ tableName, records }),
      }
    );

    // Mark synced records
    for (const syncedRecord of result.synced || []) {
      markAsSynced(tableName, syncedRecord.recordId);
    }

    // Mark failed records
    for (const failedRecord of result.failed || []) {
      markAsFailed(tableName, failedRecord.recordId);
    }

    return {
      tableName,
      uploaded: records.length,
      synced: result.syncedCount || 0,
      skipped: result.skippedCount || 0,
      queued: result.queuedCount || 0,
      failed: result.failedCount || 0,
    };
  } catch (error) {
    console.error(`Failed to upload ${tableName}:`, error.message);
    return {
      tableName,
      uploaded: records.length,
      synced: 0,
      failed: records.length,
      error: error.message,
    };
  }
}

/**
 * Download records from other devices for a table
 */
async function downloadTable(tableName, since = null) {
  const db = getDatabase();

  try {
    const params = new URLSearchParams({
      tableName,
      limit: SYNC_CONFIG.batchSize.toString(),
    });

    if (since) {
      params.append("since", since);
    }

    const result = await fetchWithTimeout(
      `${SYNC_CONFIG.serverUrl}/api/sync/download?${params}`
    );

    const records = result.records || [];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const record of records) {
      try {
        // Filter out server_updated_at - it's only on the server, not in local SQLite
        const { server_updated_at, ...localRecord } = record;

        const existing = db
          .prepare(`SELECT id, updated_at FROM ${tableName} WHERE id = ?`)
          .get(localRecord.id);

        if (!existing) {
          // Insert new record
          const columns = Object.keys(localRecord);
          const placeholders = columns.map(() => "?").join(", ");
          const values = columns.map((col) => localRecord[col]);

          db.prepare(
            `
            INSERT INTO ${tableName} (${columns.join(", ")})
            VALUES (${placeholders})
          `
          ).run(...values);
          inserted++;
        } else if (
          new Date(localRecord.updated_at) > new Date(existing.updated_at)
        ) {
          // Update existing record
          const columns = Object.keys(localRecord).filter((k) => k !== "id");
          const setClause = columns.map((col) => `${col} = ?`).join(", ");
          const values = columns.map((col) => localRecord[col]);
          values.push(localRecord.id);

          db.prepare(
            `
            UPDATE ${tableName} SET ${setClause} WHERE id = ?
          `
          ).run(...values);
          updated++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(
          `Failed to insert/update ${tableName} record:`,
          error.message
        );
        skipped++;
      }
    }

    return {
      tableName,
      downloaded: records.length,
      inserted,
      updated,
      skipped,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    };
  } catch (error) {
    console.error(`Failed to download ${tableName}:`, error.message);
    return {
      tableName,
      downloaded: 0,
      inserted: 0,
      updated: 0,
      error: error.message,
    };
  }
}

/**
 * Full sync: Upload all pending, then download all new
 */
async function fullSync() {
  if (isSyncing) {
    return { success: false, error: "Sync already in progress" };
  }

  isSyncing = true;
  syncProgress = {
    phase: "starting",
    tables: {},
    startedAt: new Date().toISOString(),
  };

  const results = {
    upload: {},
    download: {},
    totalUploaded: 0,
    totalDownloaded: 0,
    errors: [],
  };

  try {
    // Phase 1: Upload pending records (in tier order)
    syncProgress.phase = "uploading";

    for (const tableName of ALL_TABLES) {
      syncProgress.tables[tableName] = { phase: "uploading" };

      const uploadResult = await uploadTable(tableName);
      results.upload[tableName] = uploadResult;
      results.totalUploaded += uploadResult.synced || 0;

      if (uploadResult.error) {
        results.errors.push({
          table: tableName,
          phase: "upload",
          error: uploadResult.error,
        });
      }

      syncProgress.tables[tableName] = {
        phase: "upload_complete",
        result: uploadResult,
      };
    }

    // Phase 2: Download records from other devices (in tier order)
    syncProgress.phase = "downloading";

    for (const tableName of ALL_TABLES) {
      syncProgress.tables[tableName].phase = "downloading";

      let downloadResult;
      let totalDownloaded = 0;

      // Handle pagination
      do {
        downloadResult = await downloadTable(
          tableName,
          downloadResult?.nextCursor || lastSyncAt
        );
        totalDownloaded += downloadResult.downloaded;

        if (downloadResult.error) {
          results.errors.push({
            table: tableName,
            phase: "download",
            error: downloadResult.error,
          });
          break;
        }
      } while (downloadResult.hasMore);

      results.download[tableName] = {
        tableName,
        downloaded: totalDownloaded,
        inserted: downloadResult.inserted || 0,
        updated: downloadResult.updated || 0,
      };
      results.totalDownloaded += totalDownloaded;

      syncProgress.tables[tableName] = { phase: "complete" };
    }

    // Update last sync time
    lastSyncAt = new Date().toISOString();

    syncProgress.phase = "complete";
    syncProgress.completedAt = new Date().toISOString();

    return {
      success: true,
      ...results,
      lastSyncAt,
    };
  } catch (error) {
    console.error("Full sync failed:", error);
    results.errors.push({ phase: "general", error: error.message });

    return {
      success: false,
      ...results,
      error: error.message,
    };
  } finally {
    isSyncing = false;
  }
}

/**
 * Upload only pending records
 */
async function uploadPending() {
  if (isSyncing) {
    return { success: false, error: "Sync already in progress" };
  }

  isSyncing = true;
  const results = { tables: {}, totalSynced: 0, errors: [] };

  try {
    for (const tableName of ALL_TABLES) {
      const result = await uploadTable(tableName);
      results.tables[tableName] = result;
      results.totalSynced += result.synced || 0;

      if (result.error) {
        results.errors.push({ table: tableName, error: result.error });
      }
    }

    return { success: true, ...results };
  } catch (error) {
    return { success: false, error: error.message, ...results };
  } finally {
    isSyncing = false;
  }
}

/**
 * Download only new records
 */
async function downloadNew() {
  if (isSyncing) {
    return { success: false, error: "Sync already in progress" };
  }

  isSyncing = true;
  const results = { tables: {}, totalDownloaded: 0, errors: [] };

  try {
    for (const tableName of ALL_TABLES) {
      const result = await downloadTable(tableName, lastSyncAt);
      results.tables[tableName] = result;
      results.totalDownloaded += result.downloaded || 0;

      if (result.error) {
        results.errors.push({ table: tableName, error: result.error });
      }
    }

    lastSyncAt = new Date().toISOString();

    return { success: true, ...results, lastSyncAt };
  } catch (error) {
    return { success: false, error: error.message, ...results };
  } finally {
    isSyncing = false;
  }
}

/**
 * Check server health
 */
async function checkServerHealth() {
  try {
    const result = await fetchWithTimeout(
      `${SYNC_CONFIG.serverUrl}/api/health`
    );
    return { online: true, ...result };
  } catch (error) {
    return { online: false, error: error.message };
  }
}

/**
 * Get sync status
 */
function getSyncStatus() {
  const stats = getSyncStatistics();
  let totalPending = 0;

  for (const tableName of ALL_TABLES) {
    if (stats[tableName]) {
      totalPending += stats[tableName].PENDING || 0;
    }
  }

  return {
    isSyncing,
    lastSyncAt,
    progress: syncProgress,
    pendingRecords: totalPending,
    statistics: stats,
  };
}

/**
 * Configure sync server URL
 */
function setServerUrl(url) {
  SYNC_CONFIG.serverUrl = url;
}

/**
 * Get server URL
 */
function getServerUrl() {
  return SYNC_CONFIG.serverUrl;
}

module.exports = {
  fullSync,
  uploadPending,
  downloadNew,
  uploadTable,
  downloadTable,
  checkServerHealth,
  getSyncStatus,
  setServerUrl,
  getServerUrl,
  SYNC_ORDER,
  ALL_TABLES,
};
