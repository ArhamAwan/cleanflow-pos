const { v4: uuidv4 } = require('uuid');
const { getDatabase, getDeviceId, getCurrentTimestamp } = require('../db/database.cjs');
const { withTransaction } = require('../db/transaction.cjs');
const { createAuditLog } = require('./audit.cjs');
const { createLedgerEntry, ENTRY_TYPES, REFERENCE_TYPES } = require('./ledgers.cjs');
const { updateOutstandingBalance } = require('./customers.cjs');
const { updatePaymentStatus } = require('./jobs.cjs');

/**
 * Payment Service
 * Handles all payment CRUD operations with ledger entries and audit logging
 */

/**
 * Create a new payment
 * Creates payment record + ledger entry + updates job status + audit log
 * @param {Object} data - Payment data
 * @param {string} [userId] - User making the change
 * @returns {Object} Created payment
 */
function createPayment(data, userId = null) {
  return withTransaction((db) => {
    const deviceId = getDeviceId();
    const now = getCurrentTimestamp();
    const id = uuidv4();
    
    // Validate customer if provided
    let customerName = null;
    if (data.customerId) {
      const customer = db.prepare('SELECT name FROM customers WHERE id = ?').get(data.customerId);
      if (!customer) {
        throw new Error(`Customer ${data.customerId} not found`);
      }
      customerName = customer.name;
    }
    
    // Validate job if provided
    if (data.jobId) {
      const job = db.prepare('SELECT id FROM jobs WHERE id = ?').get(data.jobId);
      if (!job) {
        throw new Error(`Job ${data.jobId} not found`);
      }
    }
    
    const stmt = db.prepare(`
      INSERT INTO payments (
        id, type, amount, method, customer_id, job_id, description, date,
        created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `);
    
    stmt.run(
      id,
      data.type,
      data.amount,
      data.method,
      data.customerId || null,
      data.jobId || null,
      data.description || '',
      data.date,
      now,
      now,
      deviceId
    );
    
    const payment = {
      id,
      type: data.type,
      amount: data.amount,
      method: data.method,
      customerId: data.customerId || null,
      customerName,
      jobId: data.jobId || null,
      description: data.description || '',
      date: data.date,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'PENDING',
      deviceId,
    };
    
    // Create ledger entry based on payment type
    if (data.type === 'cash_in') {
      // Customer payment - credit to customer account
      createLedgerEntry({
        entryType: ENTRY_TYPES.PAYMENT_RECEIVED,
        referenceType: REFERENCE_TYPES.PAYMENT,
        referenceId: id,
        customerId: data.customerId,
        description: `Payment received: ${data.description || 'Payment'} (${data.method})`,
        debit: 0,
        credit: data.amount,
        date: data.date,
      }, db);
      
      // Update customer outstanding balance if customer provided
      if (data.customerId) {
        updateOutstandingBalance(data.customerId, db);
      }
      
      // Update job payment status if job provided
      if (data.jobId) {
        updatePaymentStatus(data.jobId, db);
      }
    } else {
      // Cash out - no customer ledger entry, just cash ledger
      createLedgerEntry({
        entryType: ENTRY_TYPES.PAYMENT_MADE,
        referenceType: REFERENCE_TYPES.PAYMENT,
        referenceId: id,
        customerId: null,
        description: `Payment made: ${data.description || 'Cash out'} (${data.method})`,
        debit: data.amount,
        credit: 0,
        date: data.date,
      }, db);
    }
    
    // Create audit log
    createAuditLog({
      action: 'CREATE',
      tableName: 'payments',
      recordId: id,
      oldValue: null,
      newValue: payment,
      userId,
    }, db);
    
    return payment;
  });
}

/**
 * Get all payments
 * @param {Object} filters - Optional filters
 * @returns {Array} List of payments
 */
function getPayments(filters = {}) {
  const db = getDatabase();
  
  let query = `
    SELECT p.*, c.name as customer_name
    FROM payments p
    LEFT JOIN customers c ON p.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];
  
  if (filters.type) {
    query += ' AND p.type = ?';
    params.push(filters.type);
  }
  
  if (filters.method) {
    query += ' AND p.method = ?';
    params.push(filters.method);
  }
  
  if (filters.customerId) {
    query += ' AND p.customer_id = ?';
    params.push(filters.customerId);
  }
  
  if (filters.jobId) {
    query += ' AND p.job_id = ?';
    params.push(filters.jobId);
  }
  
  if (filters.startDate) {
    query += ' AND p.date >= ?';
    params.push(filters.startDate);
  }
  
  if (filters.endDate) {
    query += ' AND p.date <= ?';
    params.push(filters.endDate);
  }
  
  query += ' ORDER BY p.date DESC, p.created_at DESC';
  
  const payments = db.prepare(query).all(...params);
  return payments.map(formatPayment);
}

/**
 * Get payment by ID
 * @param {string} id - Payment ID
 * @returns {Object|null} Payment
 */
function getPaymentById(id) {
  const db = getDatabase();
  
  const payment = db.prepare(`
    SELECT p.*, c.name as customer_name
    FROM payments p
    LEFT JOIN customers c ON p.customer_id = c.id
    WHERE p.id = ?
  `).get(id);
  
  return payment ? formatPayment(payment) : null;
}

/**
 * Get payments by job
 * @param {string} jobId - Job ID
 * @returns {Array} List of payments
 */
function getPaymentsByJob(jobId) {
  return getPayments({ jobId });
}

/**
 * Get payments by customer
 * @param {string} customerId - Customer ID
 * @returns {Array} List of payments
 */
function getPaymentsByCustomer(customerId) {
  return getPayments({ customerId });
}

/**
 * Get total cash in/out for a date range
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Object} Cash totals
 */
function getCashTotals(startDate, endDate) {
  const db = getDatabase();
  
  const result = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'cash_in' THEN amount ELSE 0 END), 0) as total_cash_in,
      COALESCE(SUM(CASE WHEN type = 'cash_out' THEN amount ELSE 0 END), 0) as total_cash_out
    FROM payments
    WHERE date >= ? AND date <= ?
  `).get(startDate, endDate);
  
  return {
    totalCashIn: result.total_cash_in,
    totalCashOut: result.total_cash_out,
    netCash: result.total_cash_in - result.total_cash_out,
  };
}

/**
 * Format payment from DB row
 */
function formatPayment(row) {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    method: row.method,
    customerId: row.customer_id,
    customerName: row.customer_name || null,
    jobId: row.job_id,
    description: row.description,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    deviceId: row.device_id,
  };
}

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  getPaymentsByJob,
  getPaymentsByCustomer,
  getCashTotals,
};
