/**
 * Dependency Service
 *
 * Handles fetching and checking dependencies for sync operations.
 */

const { query } = require("../config/database");
const { getDependencyFields, getDependencies } = require("../config/syncOrder");
const logger = require("../config/logger");

/**
 * Fetch dependencies for a list of records
 * @param {string} tableName - Table name
 * @param {string[]} recordIds - Array of record IDs
 * @returns {Object} Dependencies grouped by table
 */
async function fetchDependencies(tableName, recordIds) {
  const depFields = getDependencyFields(tableName);
  const dependencies = {};

  if (Object.keys(depFields).length === 0) {
    return dependencies; // No dependencies for this table
  }

  // Get the records first to find their dependency IDs
  const recordsResult = await query(
    `SELECT * FROM ${tableName} WHERE id = ANY($1)`,
    [recordIds]
  );

  // Collect dependency IDs by table
  const depIdsByTable = {};

  for (const record of recordsResult.rows) {
    for (const [field, depTable] of Object.entries(depFields)) {
      if (record[field]) {
        if (!depIdsByTable[depTable]) {
          depIdsByTable[depTable] = new Set();
        }
        depIdsByTable[depTable].add(record[field]);
      }
    }
  }

  // Fetch dependencies from each table
  for (const [depTable, ids] of Object.entries(depIdsByTable)) {
    if (ids.size > 0) {
      const depResult = await query(
        `SELECT * FROM ${depTable} WHERE id = ANY($1)`,
        [Array.from(ids)]
      );

      dependencies[depTable] = depResult.rows;
    }
  }

  return dependencies;
}

/**
 * Check for missing dependencies for a list of records
 * @param {string} tableName - Table name
 * @param {string[]} recordIds - Array of record IDs
 * @returns {Object} Missing dependencies by table
 */
async function checkMissingDependencies(tableName, recordIds) {
  const depFields = getDependencyFields(tableName);
  const missing = {};

  if (Object.keys(depFields).length === 0) {
    return missing; // No dependencies for this table
  }

  // Get the records first to find their dependency IDs
  const recordsResult = await query(
    `SELECT * FROM ${tableName} WHERE id = ANY($1)`,
    [recordIds]
  );

  // Collect dependency IDs by table
  const depIdsByTable = {};

  for (const record of recordsResult.rows) {
    for (const [field, depTable] of Object.entries(depFields)) {
      if (record[field]) {
        if (!depIdsByTable[depTable]) {
          depIdsByTable[depTable] = new Set();
        }
        depIdsByTable[depTable].add(record[field]);
      }
    }
  }

  // Check which dependencies exist
  for (const [depTable, ids] of Object.entries(depIdsByTable)) {
    if (ids.size > 0) {
      const idsArray = Array.from(ids);
      const existingResult = await query(
        `SELECT id FROM ${depTable} WHERE id = ANY($1)`,
        [idsArray]
      );

      const existingIds = new Set(existingResult.rows.map((r) => r.id));
      const missingIds = idsArray.filter((id) => !existingIds.has(id));

      if (missingIds.length > 0) {
        missing[depTable] = missingIds;
      }
    }
  }

  return missing;
}

/**
 * Fetch specific records by IDs from a table
 * @param {string} tableName - Table name
 * @param {string[]} ids - Record IDs
 * @returns {Array} Records
 */
async function fetchRecordsByIds(tableName, ids) {
  if (!ids || ids.length === 0) {
    return [];
  }

  const result = await query(`SELECT * FROM ${tableName} WHERE id = ANY($1)`, [
    ids,
  ]);

  return result.rows;
}

/**
 * Check if specific dependency IDs exist
 * @param {string} tableName - Dependency table name
 * @param {string[]} ids - IDs to check
 * @returns {Object} { existing: [], missing: [] }
 */
async function checkIdsExist(tableName, ids) {
  if (!ids || ids.length === 0) {
    return { existing: [], missing: [] };
  }

  const result = await query(`SELECT id FROM ${tableName} WHERE id = ANY($1)`, [
    ids,
  ]);

  const existingIds = new Set(result.rows.map((r) => r.id));

  return {
    existing: ids.filter((id) => existingIds.has(id)),
    missing: ids.filter((id) => !existingIds.has(id)),
  };
}

/**
 * Get all dependencies recursively for a table
 * (For complex dependency chains)
 * @param {string} tableName - Table name
 * @returns {string[]} Array of all dependent table names
 */
function getAllDependencies(tableName, visited = new Set()) {
  if (visited.has(tableName)) {
    return [];
  }
  visited.add(tableName);

  const directDeps = getDependencies(tableName);
  const allDeps = [...directDeps];

  for (const dep of directDeps) {
    const transitiveDeps = getAllDependencies(dep, visited);
    allDeps.push(...transitiveDeps);
  }

  return [...new Set(allDeps)];
}

module.exports = {
  fetchDependencies,
  checkMissingDependencies,
  fetchRecordsByIds,
  checkIdsExist,
  getAllDependencies,
};
