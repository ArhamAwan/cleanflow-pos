const { v4: uuidv4 } = require('uuid');
const { getDatabase, getDeviceId, getCurrentTimestamp } = require('../db/database.cjs');
const { withTransaction } = require('../db/transaction.cjs');
const { createAuditLog } = require('./audit.cjs');

/**
 * Warehouse Service
 * Handles warehouse management operations
 */

/**
 * Create a new warehouse
 */
function createWarehouse(warehouseData, userId = null) {
  return withTransaction((db) => {
    const deviceId = getDeviceId();
    const now = getCurrentTimestamp();
    const id = uuidv4();
    
    // If this is set as default, unset other defaults
    if (warehouseData.isDefault) {
      db.prepare('UPDATE warehouses SET is_default = 0 WHERE device_id = ?').run(deviceId);
    }
    
    const stmt = db.prepare(`
      INSERT INTO warehouses (
        id, name, address, is_default, is_active,
        created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `);
    
    stmt.run(
      id,
      warehouseData.name,
      warehouseData.address || null,
      warehouseData.isDefault ? 1 : 0,
      warehouseData.isActive !== undefined ? (warehouseData.isActive ? 1 : 0) : 1,
      now,
      now,
      deviceId
    );
    
    const warehouse = {
      id,
      name: warehouseData.name,
      address: warehouseData.address || null,
      isDefault: warehouseData.isDefault || false,
      isActive: warehouseData.isActive !== undefined ? warehouseData.isActive : true,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'PENDING',
      deviceId,
    };
    
    // Create audit log
    createAuditLog({
      action: 'CREATE',
      tableName: 'warehouses',
      recordId: id,
      oldValue: null,
      newValue: warehouse,
      userId,
    }, db);
    
    return warehouse;
  });
}

/**
 * Update an existing warehouse
 */
function updateWarehouse(warehouseId, warehouseData, userId = null) {
  return withTransaction((db) => {
    const deviceId = getDeviceId();
    const now = getCurrentTimestamp();
    
    // Get old value for audit
    const oldWarehouse = db.prepare('SELECT * FROM warehouses WHERE id = ? AND device_id = ?').get(warehouseId, deviceId);
    if (!oldWarehouse) {
      throw new Error(`Warehouse ${warehouseId} not found`);
    }
    
    // If setting as default, unset other defaults
    if (warehouseData.isDefault) {
      db.prepare('UPDATE warehouses SET is_default = 0 WHERE device_id = ? AND id != ?').run(deviceId, warehouseId);
    }
    
    const stmt = db.prepare(`
      UPDATE warehouses SET
        name = COALESCE(?, name),
        address = COALESCE(?, address),
        is_default = COALESCE(?, is_default),
        is_active = COALESCE(?, is_active),
        updated_at = ?
      WHERE id = ? AND device_id = ?
    `);
    
    stmt.run(
      warehouseData.name || null,
      warehouseData.address !== undefined ? warehouseData.address : null,
      warehouseData.isDefault !== undefined ? (warehouseData.isDefault ? 1 : 0) : null,
      warehouseData.isActive !== undefined ? (warehouseData.isActive ? 1 : 0) : null,
      now,
      warehouseId,
      deviceId
    );
    
    const updatedWarehouse = db.prepare('SELECT * FROM warehouses WHERE id = ? AND device_id = ?').get(warehouseId, deviceId);
    
    // Create audit log
    createAuditLog({
      action: 'UPDATE',
      tableName: 'warehouses',
      recordId: warehouseId,
      oldValue: oldWarehouse,
      newValue: updatedWarehouse,
      userId,
    }, db);
    
    return formatWarehouse(updatedWarehouse);
  });
}

/**
 * Get all warehouses
 */
function getWarehouses(filters = {}) {
  const db = getDatabase();
  const deviceId = getDeviceId();
  
  let query = 'SELECT * FROM warehouses WHERE device_id = ?';
  const params = [deviceId];
  
  if (filters.isActive !== undefined) {
    query += ' AND is_active = ?';
    params.push(filters.isActive ? 1 : 0);
  }
  
  query += ' ORDER BY is_default DESC, name ASC';
  
  const warehouses = db.prepare(query).all(...params);
  return warehouses.map(formatWarehouse);
}

/**
 * Get warehouse by ID
 */
function getWarehouseById(warehouseId) {
  const db = getDatabase();
  const deviceId = getDeviceId();
  
  const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ? AND device_id = ?').get(warehouseId, deviceId);
  return warehouse ? formatWarehouse(warehouse) : null;
}

/**
 * Get default warehouse
 */
function getDefaultWarehouse() {
  const db = getDatabase();
  const deviceId = getDeviceId();
  
  const warehouse = db.prepare('SELECT * FROM warehouses WHERE is_default = 1 AND is_active = 1 AND device_id = ?').get(deviceId);
  return warehouse ? formatWarehouse(warehouse) : null;
}

/**
 * Format warehouse from database row
 */
function formatWarehouse(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    isDefault: row.is_default === 1,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    deviceId: row.device_id,
  };
}

module.exports = {
  createWarehouse,
  updateWarehouse,
  getWarehouses,
  getWarehouseById,
  getDefaultWarehouse,
};


