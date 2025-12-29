const { v4: uuidv4 } = require('uuid');
const { getDatabase, getDeviceId, getCurrentTimestamp } = require('../db/database.cjs');
const { withTransaction } = require('../db/transaction.cjs');
const { createAuditLog } = require('./audit.cjs');
const { createLedgerEntry, ENTRY_TYPES, REFERENCE_TYPES } = require('./ledgers.cjs');
const { updateOutstandingBalance } = require('./customers.cjs');

/**
 * Job Service
 * Handles all job CRUD operations with ledger entries and audit logging
 */

/**
 * Create a new job
 * Creates job record + ledger entry (debit to customer) + audit log
 * @param {Object} data - Job data
 * @param {string} [userId] - User making the change
 * @returns {Object} Created job
 */
function createJob(data, userId = null) {
  return withTransaction((db) => {
    const deviceId = getDeviceId();
    const now = getCurrentTimestamp();
    const id = uuidv4();
    
    // Get customer and service info for ledger description
    const customer = db.prepare('SELECT name FROM customers WHERE id = ?').get(data.customerId);
    const service = db.prepare('SELECT name FROM service_types WHERE id = ?').get(data.serviceId);
    
    if (!customer) {
      throw new Error(`Customer ${data.customerId} not found`);
    }
    if (!service) {
      throw new Error(`Service ${data.serviceId} not found`);
    }
    
    const stmt = db.prepare(`
      INSERT INTO jobs (
        id, customer_id, service_id, date, amount,
        payment_status, paid_amount, notes,
        created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, ?, 'unpaid', 0, ?, ?, ?, 'PENDING', ?)
    `);
    
    stmt.run(
      id,
      data.customerId,
      data.serviceId,
      data.date,
      data.amount,
      data.notes || null,
      now,
      now,
      deviceId
    );
    
    const job = {
      id,
      customerId: data.customerId,
      customerName: customer.name,
      serviceId: data.serviceId,
      serviceName: service.name,
      date: data.date,
      amount: data.amount,
      paymentStatus: 'unpaid',
      paidAmount: 0,
      notes: data.notes || null,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'PENDING',
      deviceId,
    };
    
    // Create ledger entry (debit to customer account)
    createLedgerEntry({
      entryType: ENTRY_TYPES.JOB_CREATED,
      referenceType: REFERENCE_TYPES.JOB,
      referenceId: id,
      customerId: data.customerId,
      description: `Job: ${service.name} for ${customer.name}`,
      debit: data.amount,
      credit: 0,
      date: data.date,
    }, db);
    
    // Update customer outstanding balance
    updateOutstandingBalance(data.customerId, db);
    
    // Create audit log
    createAuditLog({
      action: 'CREATE',
      tableName: 'jobs',
      recordId: id,
      oldValue: null,
      newValue: job,
      userId,
    }, db);
    
    return job;
  });
}

/**
 * Update an existing job
 * If amount changes, creates adjustment ledger entry
 * @param {string} id - Job ID
 * @param {Object} data - Updated data
 * @param {string} [userId] - User making the change
 * @returns {Object} Updated job
 */
function updateJob(id, data, userId = null) {
  return withTransaction((db) => {
    const now = getCurrentTimestamp();
    
    // Get current job
    const current = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    if (!current) {
      throw new Error(`Job ${id} not found`);
    }
    
    const customer = db.prepare('SELECT name FROM customers WHERE id = ?').get(current.customer_id);
    
    const updates = [];
    const params = [];
    
    // Track if amount changed for ledger adjustment
    let amountDiff = 0;
    
    if (data.serviceId !== undefined) {
      updates.push('service_id = ?');
      params.push(data.serviceId);
    }
    if (data.date !== undefined) {
      updates.push('date = ?');
      params.push(data.date);
    }
    if (data.amount !== undefined && data.amount !== current.amount) {
      updates.push('amount = ?');
      params.push(data.amount);
      amountDiff = data.amount - current.amount;
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      params.push(data.notes);
    }
    
    updates.push('updated_at = ?');
    params.push(now);
    
    updates.push("sync_status = 'PENDING'");
    
    params.push(id);
    
    const stmt = db.prepare(`
      UPDATE jobs SET ${updates.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...params);
    
    // If amount changed, create adjustment ledger entry
    if (amountDiff !== 0) {
      createLedgerEntry({
        entryType: ENTRY_TYPES.ADJUSTMENT,
        referenceType: REFERENCE_TYPES.JOB,
        referenceId: id,
        customerId: current.customer_id,
        description: `Adjustment: Job amount changed for ${customer?.name || 'Unknown'}`,
        debit: amountDiff > 0 ? amountDiff : 0,
        credit: amountDiff < 0 ? Math.abs(amountDiff) : 0,
        date: now.split('T')[0],
      }, db);
      
      // Update customer outstanding balance
      updateOutstandingBalance(current.customer_id, db);
    }
    
    // Get updated job
    const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    
    // Create audit log
    createAuditLog({
      action: 'UPDATE',
      tableName: 'jobs',
      recordId: id,
      oldValue: current,
      newValue: updated,
      userId,
    }, db);
    
    return formatJob(updated, db);
  });
}

/**
 * Update job payment status based on paid amount
 * @param {string} jobId - Job ID
 * @param {Object} [db] - Database instance
 */
function updatePaymentStatus(jobId, db = null) {
  const database = db || getDatabase();
  
  const job = database.prepare('SELECT amount FROM jobs WHERE id = ?').get(jobId);
  if (!job) return;
  
  // Calculate total paid from payments
  const result = database.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_paid
    FROM payments
    WHERE job_id = ? AND type = 'cash_in'
  `).get(jobId);
  
  const paidAmount = result?.total_paid || 0;
  let paymentStatus = 'unpaid';
  
  if (paidAmount >= job.amount) {
    paymentStatus = 'paid';
  } else if (paidAmount > 0) {
    paymentStatus = 'partial';
  }
  
  database.prepare(`
    UPDATE jobs 
    SET paid_amount = ?, payment_status = ?, updated_at = ?, sync_status = 'PENDING'
    WHERE id = ?
  `).run(paidAmount, paymentStatus, getCurrentTimestamp(), jobId);
}

/**
 * Get all jobs
 * @param {Object} filters - Optional filters
 * @returns {Array} List of jobs
 */
function getJobs(filters = {}) {
  const db = getDatabase();
  
  let query = `
    SELECT j.*, c.name as customer_name, s.name as service_name
    FROM jobs j
    LEFT JOIN customers c ON j.customer_id = c.id
    LEFT JOIN service_types s ON j.service_id = s.id
    WHERE 1=1
  `;
  const params = [];
  
  if (filters.customerId) {
    query += ' AND j.customer_id = ?';
    params.push(filters.customerId);
  }
  
  if (filters.paymentStatus) {
    query += ' AND j.payment_status = ?';
    params.push(filters.paymentStatus);
  }
  
  if (filters.startDate) {
    query += ' AND j.date >= ?';
    params.push(filters.startDate);
  }
  
  if (filters.endDate) {
    query += ' AND j.date <= ?';
    params.push(filters.endDate);
  }
  
  if (filters.search) {
    query += ' AND (c.name LIKE ? OR s.name LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm);
  }
  
  query += ' ORDER BY j.date DESC, j.created_at DESC';
  
  const jobs = db.prepare(query).all(...params);
  return jobs.map(job => formatJobFromJoin(job));
}

/**
 * Get job by ID
 * @param {string} id - Job ID
 * @returns {Object|null} Job
 */
function getJobById(id) {
  const db = getDatabase();
  
  const job = db.prepare(`
    SELECT j.*, c.name as customer_name, s.name as service_name
    FROM jobs j
    LEFT JOIN customers c ON j.customer_id = c.id
    LEFT JOIN service_types s ON j.service_id = s.id
    WHERE j.id = ?
  `).get(id);
  
  return job ? formatJobFromJoin(job) : null;
}

/**
 * Get jobs by customer
 * @param {string} customerId - Customer ID
 * @returns {Array} List of jobs
 */
function getJobsByCustomer(customerId) {
  return getJobs({ customerId });
}

/**
 * Format job from DB row
 */
function formatJob(row, db = null) {
  const database = db || getDatabase();
  
  const customer = database.prepare('SELECT name FROM customers WHERE id = ?').get(row.customer_id);
  const service = database.prepare('SELECT name FROM service_types WHERE id = ?').get(row.service_id);
  
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: customer?.name || 'Unknown',
    serviceId: row.service_id,
    serviceName: service?.name || 'Unknown',
    date: row.date,
    amount: row.amount,
    paymentStatus: row.payment_status,
    paidAmount: row.paid_amount,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    deviceId: row.device_id,
  };
}

/**
 * Format job from JOIN query result
 */
function formatJobFromJoin(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name || 'Unknown',
    serviceId: row.service_id,
    serviceName: row.service_name || 'Unknown',
    date: row.date,
    amount: row.amount,
    paymentStatus: row.payment_status,
    paidAmount: row.paid_amount,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    deviceId: row.device_id,
  };
}

module.exports = {
  createJob,
  updateJob,
  updatePaymentStatus,
  getJobs,
  getJobById,
  getJobsByCustomer,
};
