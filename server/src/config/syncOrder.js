/**
 * Sync Order Configuration
 * 
 * Defines the order in which tables should be synced based on dependencies.
 * Tier 1 tables have no dependencies and should be synced first.
 * Higher tier tables depend on lower tier tables.
 */

const SYNC_TIERS = {
  tier1: ['users', 'customers', 'service_types', 'expenses'],
  tier2: ['jobs'],
  tier3: ['payments'],
  tier4: ['ledger_entries'],
  tier5: ['audit_logs']
};

// Flat list of all tables in sync order
const SYNC_ORDER = [
  ...SYNC_TIERS.tier1,
  ...SYNC_TIERS.tier2,
  ...SYNC_TIERS.tier3,
  ...SYNC_TIERS.tier4,
  ...SYNC_TIERS.tier5
];

// Dependencies map: table -> array of tables it depends on
const DEPENDENCIES = {
  users: [],
  customers: [],
  service_types: [],
  expenses: [],
  jobs: ['customers', 'service_types'],
  payments: ['customers', 'jobs'],
  ledger_entries: ['customers'],
  audit_logs: []
};

// Dependency fields map: table -> { fieldName: dependentTable }
const DEPENDENCY_FIELDS = {
  jobs: {
    customer_id: 'customers',
    service_id: 'service_types'
  },
  payments: {
    customer_id: 'customers',
    job_id: 'jobs'
  },
  ledger_entries: {
    customer_id: 'customers'
  }
};

// Valid table names
const VALID_TABLES = SYNC_ORDER;

/**
 * Get the tier number for a table
 * @param {string} tableName 
 * @returns {number} Tier number (1-5)
 */
function getTier(tableName) {
  for (const [tier, tables] of Object.entries(SYNC_TIERS)) {
    if (tables.includes(tableName)) {
      return parseInt(tier.replace('tier', ''));
    }
  }
  return -1;
}

/**
 * Check if a table is valid
 * @param {string} tableName 
 * @returns {boolean}
 */
function isValidTable(tableName) {
  return VALID_TABLES.includes(tableName);
}

/**
 * Get dependencies for a table
 * @param {string} tableName 
 * @returns {string[]} Array of dependent table names
 */
function getDependencies(tableName) {
  return DEPENDENCIES[tableName] || [];
}

/**
 * Get dependency fields for a table
 * @param {string} tableName 
 * @returns {Object} Map of field names to dependent tables
 */
function getDependencyFields(tableName) {
  return DEPENDENCY_FIELDS[tableName] || {};
}

/**
 * Validate sync order - ensure tables are synced in correct order
 * @param {string[]} tables - Array of table names in order they will be synced
 * @returns {{ valid: boolean, error?: string }}
 */
function validateSyncOrder(tables) {
  const seenTiers = new Set();
  
  for (const table of tables) {
    const tier = getTier(table);
    if (tier === -1) {
      return { valid: false, error: `Unknown table: ${table}` };
    }
    
    // Check that all lower tier dependencies have been seen
    const deps = getDependencies(table);
    for (const dep of deps) {
      const depTier = getTier(dep);
      if (!seenTiers.has(depTier) && depTier < tier) {
        return { 
          valid: false, 
          error: `Table ${table} depends on ${dep} (tier ${depTier}) which must be synced first` 
        };
      }
    }
    
    seenTiers.add(tier);
  }
  
  return { valid: true };
}

module.exports = {
  SYNC_TIERS,
  SYNC_ORDER,
  DEPENDENCIES,
  DEPENDENCY_FIELDS,
  VALID_TABLES,
  getTier,
  isValidTable,
  getDependencies,
  getDependencyFields,
  validateSyncOrder
};

