/**
 * Dependency Resolver Service
 * 
 * Handles fetching and resolving dependencies for sync operations.
 * Ensures foreign key dependencies are satisfied before inserting records.
 */

const { getDatabase, getDeviceId } = require('../db/database.cjs');

// Sync server URL (configurable)
let serverUrl = process.env.SYNC_SERVER_URL || 'http://localhost:3001';

// Dependency configuration
const DEPENDENCIES = {
  jobs: {
    customer_id: { table: 'customers', required: true },
    service_id: { table: 'service_types', required: true }
  },
  payments: {
    customer_id: { table: 'customers', required: false },
    job_id: { table: 'jobs', required: false }
  },
  ledger_entries: {
    customer_id: { table: 'customers', required: false }
  }
};

/**
 * Set server URL
 */
function setServerUrl(url) {
  serverUrl = url;
}

/**
 * Check if a record exists locally
 */
function recordExists(tableName, recordId) {
  const db = getDatabase();
  const result = db.prepare(`SELECT 1 FROM ${tableName} WHERE id = ?`).get(recordId);
  return !!result;
}

/**
 * Check which dependencies are missing for a record
 */
function getMissingDependencies(tableName, record) {
  const deps = DEPENDENCIES[tableName];
  if (!deps) return null;
  
  const missing = {};
  
  for (const [field, config] of Object.entries(deps)) {
    // Handle both snake_case and camelCase
    const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const depId = record[field] || record[camelField];
    
    if (depId) {
      if (!recordExists(config.table, depId)) {
        if (!missing[config.table]) {
          missing[config.table] = [];
        }
        missing[config.table].push(depId);
      }
    } else if (config.required) {
      // Required dependency is missing
      if (!missing[config.table]) {
        missing[config.table] = [];
      }
      missing[config.table].push(null); // Mark as missing required
    }
  }
  
  return Object.keys(missing).length > 0 ? missing : null;
}

/**
 * Fetch dependencies from server
 */
async function fetchDependenciesFromServer(tableName, recordIds) {
  try {
    const response = await fetch(`${serverUrl}/api/dependencies/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': getDeviceId()
      },
      body: JSON.stringify({ tableName, recordIds })
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    
    const result = await response.json();
    return result.dependencies || {};
  } catch (error) {
    console.error('Failed to fetch dependencies from server:', error);
    return null;
  }
}

/**
 * Insert fetched dependencies into local database
 */
function insertDependencies(dependencies) {
  const db = getDatabase();
  let inserted = 0;
  
  for (const [tableName, records] of Object.entries(dependencies)) {
    if (!Array.isArray(records)) continue;
    
    for (const record of records) {
      try {
        // Check if already exists
        if (recordExists(tableName, record.id)) {
          continue;
        }
        
        // Insert the dependency
        const columns = Object.keys(record);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map(col => record[col]);
        
        db.prepare(`
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES (${placeholders})
        `).run(...values);
        
        inserted++;
      } catch (error) {
        console.error(`Failed to insert dependency ${tableName}:${record.id}:`, error);
      }
    }
  }
  
  return inserted;
}

/**
 * Resolve dependencies for a record before inserting
 * Returns true if all dependencies are now available
 */
async function resolveDependencies(tableName, record) {
  const missing = getMissingDependencies(tableName, record);
  
  if (!missing) {
    return { resolved: true };
  }
  
  // Try to fetch missing dependencies from server
  const recordIds = [];
  for (const ids of Object.values(missing)) {
    recordIds.push(...ids.filter(id => id !== null));
  }
  
  if (recordIds.length === 0) {
    return { resolved: false, missing, error: 'Required dependencies are null' };
  }
  
  const dependencies = await fetchDependenciesFromServer(tableName, [record.id]);
  
  if (!dependencies) {
    return { resolved: false, missing, error: 'Failed to fetch dependencies from server' };
  }
  
  // Insert fetched dependencies
  const inserted = insertDependencies(dependencies);
  
  // Check again if all dependencies are now available
  const stillMissing = getMissingDependencies(tableName, record);
  
  return {
    resolved: !stillMissing,
    inserted,
    stillMissing
  };
}

/**
 * Get dependency information for a table
 */
function getDependencyInfo(tableName) {
  return DEPENDENCIES[tableName] || null;
}

/**
 * Check if a table has dependencies
 */
function hasDependencies(tableName) {
  return !!DEPENDENCIES[tableName];
}

/**
 * Get all tables that depend on a given table
 */
function getDependentTables(tableName) {
  const dependents = [];
  
  for (const [table, deps] of Object.entries(DEPENDENCIES)) {
    for (const config of Object.values(deps)) {
      if (config.table === tableName) {
        dependents.push(table);
        break;
      }
    }
  }
  
  return dependents;
}

module.exports = {
  setServerUrl,
  recordExists,
  getMissingDependencies,
  fetchDependenciesFromServer,
  insertDependencies,
  resolveDependencies,
  getDependencyInfo,
  hasDependencies,
  getDependentTables,
  DEPENDENCIES
};

