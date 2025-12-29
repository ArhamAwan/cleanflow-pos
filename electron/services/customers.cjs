const { v4: uuidv4 } = require('uuid');
const { getDatabase, getDeviceId, getCurrentTimestamp } = require('../db/database.cjs');
const { withTransaction } = require('../db/transaction.cjs');
const { createAuditLog } = require('./audit.cjs');

/**
 * Customer Service
 * Handles all customer CRUD operations with audit logging
 */

/**
 * Create a new customer
 * @param {Object} data - Customer data
 * @param {string} data.name - Customer name
 * @param {string} data.phone - Customer phone
 * @param {string} data.address - Customer address
 * @param {string} [userId] - User making the change
 * @returns {Object} Created customer
 */
function createCustomer(data, userId = null) {
  return withTransaction((db) => {
    const deviceId = getDeviceId();
    const now = getCurrentTimestamp();
    const id = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO customers (
        id, name, phone, address, outstanding_balance,
        created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, 0, ?, ?, 'PENDING', ?)
    `);
    
    stmt.run(
      id,
      data.name,
      data.phone || '',
      data.address || '',
      now,
      now,
      deviceId
    );
    
    const customer = {
      id,
      name: data.name,
      phone: data.phone || '',
      address: data.address || '',
      outstandingBalance: 0,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'PENDING',
      deviceId,
    };
    
    // Create audit log
    createAuditLog({
      action: 'CREATE',
      tableName: 'customers',
      recordId: id,
      oldValue: null,
      newValue: customer,
      userId,
    }, db);
    
    return customer;
  });
}

/**
 * Update an existing customer
 * @param {string} id - Customer ID
 * @param {Object} data - Updated data
 * @param {string} [userId] - User making the change
 * @returns {Object} Updated customer
 */
function updateCustomer(id, data, userId = null) {
  return withTransaction((db) => {
    const now = getCurrentTimestamp();
    
    // Get current customer
    const current = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!current) {
      throw new Error(`Customer ${id} not found`);
    }
    
    const updates = [];
    const params = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      params.push(data.phone);
    }
    if (data.address !== undefined) {
      updates.push('address = ?');
      params.push(data.address);
    }
    
    updates.push('updated_at = ?');
    params.push(now);
    
    updates.push("sync_status = 'PENDING'");
    
    params.push(id);
    
    const stmt = db.prepare(`
      UPDATE customers SET ${updates.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...params);
    
    // Get updated customer
    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    
    // Create audit log
    createAuditLog({
      action: 'UPDATE',
      tableName: 'customers',
      recordId: id,
      oldValue: current,
      newValue: updated,
      userId,
    }, db);
    
    return formatCustomer(updated);
  });
}

/**
 * Update customer outstanding balance
 * Called after jobs or payments are created
 * @param {string} customerId - Customer ID
 * @param {Object} [db] - Database instance
 */
function updateOutstandingBalance(customerId, db = null) {
  const database = db || getDatabase();
  
  // Calculate outstanding balance from ledger entries
  const result = database.prepare(`
    SELECT 
      COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as balance
    FROM ledger_entries 
    WHERE customer_id = ?
  `).get(customerId);
  
  const balance = result?.balance || 0;
  
  database.prepare(`
    UPDATE customers 
    SET outstanding_balance = ?, updated_at = ?, sync_status = 'PENDING'
    WHERE id = ?
  `).run(balance, getCurrentTimestamp(), customerId);
  
  return balance;
}

/**
 * Get all customers
 * @param {Object} filters - Optional filters
 * @param {string} filters.search - Search term
 * @returns {Array} List of customers
 */
function getCustomers(filters = {}) {
  const db = getDatabase();
  
  let query = 'SELECT * FROM customers WHERE 1=1';
  const params = [];
  
  if (filters.search) {
    query += ' AND (name LIKE ? OR phone LIKE ? OR address LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  query += ' ORDER BY name ASC';
  
  const customers = db.prepare(query).all(...params);
  return customers.map(formatCustomer);
}

/**
 * Get customer by ID
 * @param {string} id - Customer ID
 * @returns {Object|null} Customer
 */
function getCustomerById(id) {
  const db = getDatabase();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  return customer ? formatCustomer(customer) : null;
}

/**
 * Get customer with ledger entries
 * @param {string} id - Customer ID
 * @returns {Object|null} Customer with ledger
 */
function getCustomerWithLedger(id) {
  const db = getDatabase();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  
  if (!customer) return null;
  
  const ledgerEntries = db.prepare(`
    SELECT * FROM ledger_entries 
    WHERE customer_id = ? 
    ORDER BY created_at ASC, id ASC
  `).all(id);
  
  return {
    ...formatCustomer(customer),
    ledgerEntries,
  };
}

/**
 * Delete a customer (soft delete would be better for accounting)
 * @param {string} id - Customer ID
 * @param {string} [userId] - User making the change
 */
function deleteCustomer(id, userId = null) {
  return withTransaction((db) => {
    // Check if customer has any jobs or payments
    const hasJobs = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE customer_id = ?').get(id);
    const hasPayments = db.prepare('SELECT COUNT(*) as count FROM payments WHERE customer_id = ?').get(id);
    
    if (hasJobs.count > 0 || hasPayments.count > 0) {
      throw new Error('Cannot delete customer with existing jobs or payments');
    }
    
    const current = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!current) {
      throw new Error(`Customer ${id} not found`);
    }
    
    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    
    createAuditLog({
      action: 'DELETE',
      tableName: 'customers',
      recordId: id,
      oldValue: current,
      newValue: null,
      userId,
    }, db);
    
    return { success: true };
  });
}

/**
 * Format customer from DB row to API response
 * @param {Object} row - Database row
 * @returns {Object} Formatted customer
 */
function formatCustomer(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    outstandingBalance: row.outstanding_balance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    deviceId: row.device_id,
  };
}

module.exports = {
  createCustomer,
  updateCustomer,
  updateOutstandingBalance,
  getCustomers,
  getCustomerById,
  getCustomerWithLedger,
  deleteCustomer,
};
