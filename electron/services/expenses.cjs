const { v4: uuidv4 } = require('uuid');
const { getDatabase, getDeviceId, getCurrentTimestamp } = require('../db/database.cjs');
const { withTransaction } = require('../db/transaction.cjs');
const { createAuditLog } = require('./audit.cjs');
const { createLedgerEntry, ENTRY_TYPES, REFERENCE_TYPES } = require('./ledgers.cjs');

/**
 * Expense Service
 * Handles all expense CRUD operations with ledger entries and audit logging
 */

/**
 * Create a new expense
 * Creates expense record + ledger entry + audit log
 * @param {Object} data - Expense data
 * @param {string} [userId] - User making the change
 * @returns {Object} Created expense
 */
function createExpense(data, userId = null) {
  return withTransaction((db) => {
    const deviceId = getDeviceId();
    const now = getCurrentTimestamp();
    const id = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO expenses (
        id, category, amount, description, method, date,
        created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `);
    
    stmt.run(
      id,
      data.category,
      data.amount,
      data.description || '',
      data.method,
      data.date,
      now,
      now,
      deviceId
    );
    
    const expense = {
      id,
      category: data.category,
      amount: data.amount,
      description: data.description || '',
      method: data.method,
      date: data.date,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'PENDING',
      deviceId,
    };
    
    // Create ledger entry for expense (debit - money going out)
    createLedgerEntry({
      entryType: ENTRY_TYPES.EXPENSE_RECORDED,
      referenceType: REFERENCE_TYPES.EXPENSE,
      referenceId: id,
      customerId: null,
      description: `Expense: ${data.category} - ${data.description || 'No description'} (${data.method})`,
      debit: data.amount,
      credit: 0,
      date: data.date,
    }, db);
    
    // Create audit log
    createAuditLog({
      action: 'CREATE',
      tableName: 'expenses',
      recordId: id,
      oldValue: null,
      newValue: expense,
      userId,
    }, db);
    
    return expense;
  });
}

/**
 * Update an existing expense
 * If amount changes, creates adjustment ledger entry
 * @param {string} id - Expense ID
 * @param {Object} data - Updated data
 * @param {string} [userId] - User making the change
 * @returns {Object} Updated expense
 */
function updateExpense(id, data, userId = null) {
  return withTransaction((db) => {
    const now = getCurrentTimestamp();
    
    // Get current expense
    const current = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    if (!current) {
      throw new Error(`Expense ${id} not found`);
    }
    
    const updates = [];
    const params = [];
    
    // Track if amount changed for ledger adjustment
    let amountDiff = 0;
    
    if (data.category !== undefined) {
      updates.push('category = ?');
      params.push(data.category);
    }
    if (data.amount !== undefined && data.amount !== current.amount) {
      updates.push('amount = ?');
      params.push(data.amount);
      amountDiff = data.amount - current.amount;
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.method !== undefined) {
      updates.push('method = ?');
      params.push(data.method);
    }
    if (data.date !== undefined) {
      updates.push('date = ?');
      params.push(data.date);
    }
    
    updates.push('updated_at = ?');
    params.push(now);
    
    updates.push("sync_status = 'PENDING'");
    
    params.push(id);
    
    const stmt = db.prepare(`
      UPDATE expenses SET ${updates.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...params);
    
    // If amount changed, create adjustment ledger entry
    if (amountDiff !== 0) {
      createLedgerEntry({
        entryType: ENTRY_TYPES.ADJUSTMENT,
        referenceType: REFERENCE_TYPES.EXPENSE,
        referenceId: id,
        customerId: null,
        description: `Adjustment: Expense amount changed for ${current.category}`,
        debit: amountDiff > 0 ? amountDiff : 0,
        credit: amountDiff < 0 ? Math.abs(amountDiff) : 0,
        date: now.split('T')[0],
      }, db);
    }
    
    // Get updated expense
    const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    
    // Create audit log
    createAuditLog({
      action: 'UPDATE',
      tableName: 'expenses',
      recordId: id,
      oldValue: current,
      newValue: updated,
      userId,
    }, db);
    
    return formatExpense(updated);
  });
}

/**
 * Get all expenses
 * @param {Object} filters - Optional filters
 * @returns {Array} List of expenses
 */
function getExpenses(filters = {}) {
  const db = getDatabase();
  
  let query = 'SELECT * FROM expenses WHERE 1=1';
  const params = [];
  
  if (filters.category) {
    query += ' AND category = ?';
    params.push(filters.category);
  }
  
  if (filters.method) {
    query += ' AND method = ?';
    params.push(filters.method);
  }
  
  if (filters.startDate) {
    query += ' AND date >= ?';
    params.push(filters.startDate);
  }
  
  if (filters.endDate) {
    query += ' AND date <= ?';
    params.push(filters.endDate);
  }
  
  if (filters.search) {
    query += ' AND (category LIKE ? OR description LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm);
  }
  
  query += ' ORDER BY date DESC, created_at DESC';
  
  const expenses = db.prepare(query).all(...params);
  return expenses.map(formatExpense);
}

/**
 * Get expense by ID
 * @param {string} id - Expense ID
 * @returns {Object|null} Expense
 */
function getExpenseById(id) {
  const db = getDatabase();
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
  return expense ? formatExpense(expense) : null;
}

/**
 * Get expenses by category
 * @param {string} category - Category name
 * @returns {Array} List of expenses
 */
function getExpensesByCategory(category) {
  return getExpenses({ category });
}

/**
 * Get expense categories with totals
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Array} Categories with totals
 */
function getExpenseCategorySummary(startDate, endDate) {
  const db = getDatabase();
  
  const result = db.prepare(`
    SELECT 
      category,
      COUNT(*) as count,
      SUM(amount) as total
    FROM expenses
    WHERE date >= ? AND date <= ?
    GROUP BY category
    ORDER BY total DESC
  `).all(startDate, endDate);
  
  return result;
}

/**
 * Get total expenses for a date range
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {number} Total expenses
 */
function getTotalExpenses(startDate, endDate) {
  const db = getDatabase();
  
  const result = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE date >= ? AND date <= ?
  `).get(startDate, endDate);
  
  return result.total;
}

/**
 * Format expense from DB row
 */
function formatExpense(row) {
  return {
    id: row.id,
    category: row.category,
    amount: row.amount,
    description: row.description,
    method: row.method,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    deviceId: row.device_id,
  };
}

module.exports = {
  createExpense,
  updateExpense,
  getExpenses,
  getExpenseById,
  getExpensesByCategory,
  getExpenseCategorySummary,
  getTotalExpenses,
};
