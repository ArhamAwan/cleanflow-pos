const { v4: uuidv4 } = require('uuid');
const { getDatabase, getDeviceId, getCurrentTimestamp } = require('../db/database.cjs');

/**
 * Ledger Service
 * Handles IMMUTABLE ledger entries for double-entry bookkeeping
 * 
 * CRITICAL: Ledger entries can NEVER be deleted or modified.
 * Corrections must be done using ADJUSTMENT entries.
 */

/**
 * Entry types for ledger
 */
const ENTRY_TYPES = {
  JOB_CREATED: 'JOB_CREATED',           // Debit: customer owes money
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',  // Credit: customer paid
  PAYMENT_MADE: 'PAYMENT_MADE',          // Debit: money paid out
  EXPENSE_RECORDED: 'EXPENSE_RECORDED',  // Debit: business expense
  ADJUSTMENT: 'ADJUSTMENT',              // Correction entry
  OPENING_BALANCE: 'OPENING_BALANCE',    // Initial balance
};

/**
 * Reference types for linking entries to source records
 */
const REFERENCE_TYPES = {
  JOB: 'job',
  PAYMENT: 'payment',
  EXPENSE: 'expense',
  CUSTOMER: 'customer',
  SYSTEM: 'system',
};

/**
 * Create a ledger entry (IMMUTABLE)
 * @param {Object} params - Ledger entry parameters
 * @param {string} params.entryType - Type of entry (from ENTRY_TYPES)
 * @param {string} params.referenceType - Type of reference (from REFERENCE_TYPES)
 * @param {string} params.referenceId - ID of the referenced record
 * @param {string|null} params.customerId - Customer ID (if applicable)
 * @param {string} params.description - Description of the entry
 * @param {number} params.debit - Debit amount
 * @param {number} params.credit - Credit amount
 * @param {string} params.date - Date of the entry
 * @param {Object} [db] - Database instance (for transactions)
 * @returns {Object} Created ledger entry
 */
function createLedgerEntry({ 
  entryType, 
  referenceType, 
  referenceId, 
  customerId, 
  description, 
  debit = 0, 
  credit = 0,
  date 
}, db = null) {
  const database = db || getDatabase();
  const deviceId = getDeviceId();
  const now = getCurrentTimestamp();
  const id = uuidv4();
  
  // Calculate running balance for customer ledger if customerId is provided
  let balance = 0;
  if (customerId) {
    const lastEntry = database.prepare(`
      SELECT balance FROM ledger_entries 
      WHERE customer_id = ? 
      ORDER BY created_at DESC, id DESC 
      LIMIT 1
    `).get(customerId);
    
    balance = (lastEntry?.balance || 0) + debit - credit;
  } else {
    // For cash ledger, calculate overall balance
    const lastEntry = database.prepare(`
      SELECT balance FROM ledger_entries 
      WHERE customer_id IS NULL 
      ORDER BY created_at DESC, id DESC 
      LIMIT 1
    `).get();
    
    balance = (lastEntry?.balance || 0) + debit - credit;
  }
  
  const stmt = database.prepare(`
    INSERT INTO ledger_entries (
      id, entry_type, reference_type, reference_id, customer_id,
      description, debit, credit, balance, date,
      created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `);
  
  stmt.run(
    id,
    entryType,
    referenceType,
    referenceId,
    customerId,
    description,
    debit,
    credit,
    balance,
    date,
    now,
    now,
    deviceId
  );
  
  return {
    id,
    entryType,
    referenceType,
    referenceId,
    customerId,
    description,
    debit,
    credit,
    balance,
    date,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'PENDING',
    deviceId,
  };
}

/**
 * Create an adjustment entry to correct a previous entry
 * @param {Object} params - Adjustment parameters
 * @param {string} params.originalEntryId - ID of the entry being corrected
 * @param {string} params.reason - Reason for adjustment
 * @param {number} params.adjustmentDebit - Adjustment debit amount
 * @param {number} params.adjustmentCredit - Adjustment credit amount
 * @param {Object} [db] - Database instance
 * @returns {Object} Created adjustment entry
 */
function createAdjustmentEntry({ 
  originalEntryId, 
  reason, 
  adjustmentDebit = 0, 
  adjustmentCredit = 0,
  customerId 
}, db = null) {
  const database = db || getDatabase();
  
  // Get original entry for reference
  const originalEntry = database.prepare(
    'SELECT * FROM ledger_entries WHERE id = ?'
  ).get(originalEntryId);
  
  if (!originalEntry) {
    throw new Error(`Original entry ${originalEntryId} not found`);
  }
  
  const description = `ADJUSTMENT: ${reason} (Ref: ${originalEntryId})`;
  
  return createLedgerEntry({
    entryType: ENTRY_TYPES.ADJUSTMENT,
    referenceType: REFERENCE_TYPES.SYSTEM,
    referenceId: originalEntryId,
    customerId: customerId || originalEntry.customer_id,
    description,
    debit: adjustmentDebit,
    credit: adjustmentCredit,
    date: getCurrentTimestamp().split('T')[0],
  }, database);
}

/**
 * Get cash ledger entries (entries without customer_id)
 * @param {Object} filters - Optional filters
 * @param {string} filters.startDate - Start date
 * @param {string} filters.endDate - End date
 * @returns {Array} Cash ledger entries
 */
function getCashLedger(filters = {}) {
  const db = getDatabase();
  
  let query = `
    SELECT * FROM ledger_entries 
    WHERE customer_id IS NULL
  `;
  const params = [];
  
  if (filters.startDate) {
    query += ' AND date >= ?';
    params.push(filters.startDate);
  }
  
  if (filters.endDate) {
    query += ' AND date <= ?';
    params.push(filters.endDate);
  }
  
  query += ' ORDER BY created_at ASC, id ASC';
  
  return db.prepare(query).all(...params);
}

/**
 * Get customer ledger entries
 * @param {string} customerId - Customer ID
 * @param {Object} filters - Optional filters
 * @param {string} filters.startDate - Start date
 * @param {string} filters.endDate - End date
 * @returns {Array} Customer ledger entries
 */
function getCustomerLedger(customerId, filters = {}) {
  const db = getDatabase();
  
  let query = `
    SELECT * FROM ledger_entries 
    WHERE customer_id = ?
  `;
  const params = [customerId];
  
  if (filters.startDate) {
    query += ' AND date >= ?';
    params.push(filters.startDate);
  }
  
  if (filters.endDate) {
    query += ' AND date <= ?';
    params.push(filters.endDate);
  }
  
  query += ' ORDER BY created_at ASC, id ASC';
  
  return db.prepare(query).all(...params);
}

/**
 * Get all ledger entries
 * @param {Object} filters - Optional filters
 * @returns {Array} Ledger entries
 */
function getAllLedgerEntries(filters = {}) {
  const db = getDatabase();
  
  let query = 'SELECT * FROM ledger_entries WHERE 1=1';
  const params = [];
  
  if (filters.entryType) {
    query += ' AND entry_type = ?';
    params.push(filters.entryType);
  }
  
  if (filters.customerId) {
    query += ' AND customer_id = ?';
    params.push(filters.customerId);
  }
  
  if (filters.startDate) {
    query += ' AND date >= ?';
    params.push(filters.startDate);
  }
  
  if (filters.endDate) {
    query += ' AND date <= ?';
    params.push(filters.endDate);
  }
  
  query += ' ORDER BY created_at DESC, id DESC';
  
  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }
  
  return db.prepare(query).all(...params);
}

/**
 * Get ledger entry by ID
 * @param {string} id - Ledger entry ID
 * @returns {Object|null} Ledger entry
 */
function getLedgerEntryById(id) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM ledger_entries WHERE id = ?').get(id);
}

/**
 * Recalculate running balances for a customer
 * Used after data import or sync conflicts
 * @param {string} customerId - Customer ID
 * @param {Object} [db] - Database instance
 */
function recalculateCustomerBalance(customerId, db = null) {
  // Note: This would require temporarily disabling the update trigger
  // For now, we'll just calculate and return the correct balance
  const database = db || getDatabase();
  
  const entries = database.prepare(`
    SELECT id, debit, credit FROM ledger_entries 
    WHERE customer_id = ? 
    ORDER BY created_at ASC, id ASC
  `).all(customerId);
  
  let balance = 0;
  for (const entry of entries) {
    balance += entry.debit - entry.credit;
  }
  
  return balance;
}

module.exports = {
  ENTRY_TYPES,
  REFERENCE_TYPES,
  createLedgerEntry,
  createAdjustmentEntry,
  getCashLedger,
  getCustomerLedger,
  getAllLedgerEntries,
  getLedgerEntryById,
  recalculateCustomerBalance,
};
