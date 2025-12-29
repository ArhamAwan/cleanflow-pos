const { v4: uuidv4 } = require('uuid');
const { getDatabase, getDeviceId, getCurrentTimestamp } = require('../db/database.cjs');
const { withTransaction } = require('../db/transaction.cjs');
const { createAuditLog } = require('./audit.cjs');

/**
 * Service Types Service
 * Handles service catalog CRUD operations
 */

/**
 * Create a new service type
 * @param {Object} data - Service type data
 * @param {string} [userId] - User making the change
 * @returns {Object} Created service type
 */
function createServiceType(data, userId = null) {
  return withTransaction((db) => {
    const deviceId = getDeviceId();
    const now = getCurrentTimestamp();
    const id = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO service_types (
        id, name, description, price, is_active,
        created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, 1, ?, ?, 'PENDING', ?)
    `);
    
    stmt.run(
      id,
      data.name,
      data.description || '',
      data.price,
      now,
      now,
      deviceId
    );
    
    const serviceType = {
      id,
      name: data.name,
      description: data.description || '',
      price: data.price,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'PENDING',
      deviceId,
    };
    
    createAuditLog({
      action: 'CREATE',
      tableName: 'service_types',
      recordId: id,
      oldValue: null,
      newValue: serviceType,
      userId,
    }, db);
    
    return serviceType;
  });
}

/**
 * Update an existing service type
 * @param {string} id - Service type ID
 * @param {Object} data - Updated data
 * @param {string} [userId] - User making the change
 * @returns {Object} Updated service type
 */
function updateServiceType(id, data, userId = null) {
  return withTransaction((db) => {
    const now = getCurrentTimestamp();
    
    const current = db.prepare('SELECT * FROM service_types WHERE id = ?').get(id);
    if (!current) {
      throw new Error(`Service type ${id} not found`);
    }
    
    const updates = [];
    const params = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.price !== undefined) {
      updates.push('price = ?');
      params.push(data.price);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }
    
    updates.push('updated_at = ?');
    params.push(now);
    
    updates.push("sync_status = 'PENDING'");
    
    params.push(id);
    
    const stmt = db.prepare(`
      UPDATE service_types SET ${updates.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...params);
    
    const updated = db.prepare('SELECT * FROM service_types WHERE id = ?').get(id);
    
    createAuditLog({
      action: 'UPDATE',
      tableName: 'service_types',
      recordId: id,
      oldValue: current,
      newValue: updated,
      userId,
    }, db);
    
    return formatServiceType(updated);
  });
}

/**
 * Get all service types
 * @param {Object} filters - Optional filters
 * @returns {Array} List of service types
 */
function getServiceTypes(filters = {}) {
  const db = getDatabase();
  
  let query = 'SELECT * FROM service_types WHERE 1=1';
  const params = [];
  
  if (filters.activeOnly !== false) {
    query += ' AND is_active = 1';
  }
  
  if (filters.search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm);
  }
  
  query += ' ORDER BY name ASC';
  
  const serviceTypes = db.prepare(query).all(...params);
  return serviceTypes.map(formatServiceType);
}

/**
 * Get service type by ID
 * @param {string} id - Service type ID
 * @returns {Object|null} Service type
 */
function getServiceTypeById(id) {
  const db = getDatabase();
  const serviceType = db.prepare('SELECT * FROM service_types WHERE id = ?').get(id);
  return serviceType ? formatServiceType(serviceType) : null;
}

/**
 * Delete a service type (soft delete by setting is_active = 0)
 * @param {string} id - Service type ID
 * @param {string} [userId] - User making the change
 */
function deleteServiceType(id, userId = null) {
  return updateServiceType(id, { isActive: false }, userId);
}

/**
 * Format service type from DB row
 */
function formatServiceType(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    deviceId: row.device_id,
  };
}

module.exports = {
  createServiceType,
  updateServiceType,
  getServiceTypes,
  getServiceTypeById,
  deleteServiceType,
};
