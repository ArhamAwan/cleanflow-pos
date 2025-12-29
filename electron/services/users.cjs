const { v4: uuidv4 } = require('uuid');
const { getDatabase, getDeviceId, getCurrentTimestamp } = require('../db/database.cjs');
const { withTransaction } = require('../db/transaction.cjs');
const { createAuditLog } = require('./audit.cjs');

/**
 * Users Service
 * Handles local user management
 */

/**
 * Create a new user
 * @param {Object} data - User data
 * @param {string} [adminUserId] - Admin user making the change
 * @returns {Object} Created user
 */
function createUser(data, adminUserId = null) {
  return withTransaction((db) => {
    const deviceId = getDeviceId();
    const now = getCurrentTimestamp();
    const id = uuidv4();
    
    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
    if (existing) {
      throw new Error('A user with this email already exists');
    }
    
    const stmt = db.prepare(`
      INSERT INTO users (
        id, name, email, password_hash, role, is_active,
        created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'PENDING', ?)
    `);
    
    stmt.run(
      id,
      data.name,
      data.email,
      data.passwordHash || null, // Password hashing should be done before calling this
      data.role,
      now,
      now,
      deviceId
    );
    
    const user = {
      id,
      name: data.name,
      email: data.email,
      role: data.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'PENDING',
      deviceId,
    };
    
    createAuditLog({
      action: 'CREATE',
      tableName: 'users',
      recordId: id,
      oldValue: null,
      newValue: { ...user, passwordHash: '[REDACTED]' },
      userId: adminUserId,
    }, db);
    
    return user;
  });
}

/**
 * Update an existing user
 * @param {string} id - User ID
 * @param {Object} data - Updated data
 * @param {string} [adminUserId] - Admin user making the change
 * @returns {Object} Updated user
 */
function updateUser(id, data, adminUserId = null) {
  return withTransaction((db) => {
    const now = getCurrentTimestamp();
    
    const current = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!current) {
      throw new Error(`User ${id} not found`);
    }
    
    const updates = [];
    const params = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.email !== undefined) {
      // Check if new email is taken
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(data.email, id);
      if (existing) {
        throw new Error('A user with this email already exists');
      }
      updates.push('email = ?');
      params.push(data.email);
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      params.push(data.role);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }
    if (data.passwordHash !== undefined) {
      updates.push('password_hash = ?');
      params.push(data.passwordHash);
    }
    
    updates.push('updated_at = ?');
    params.push(now);
    
    updates.push("sync_status = 'PENDING'");
    
    params.push(id);
    
    const stmt = db.prepare(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...params);
    
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    
    createAuditLog({
      action: 'UPDATE',
      tableName: 'users',
      recordId: id,
      oldValue: { ...current, password_hash: '[REDACTED]' },
      newValue: { ...updated, password_hash: '[REDACTED]' },
      userId: adminUserId,
    }, db);
    
    return formatUser(updated);
  });
}

/**
 * Get all users
 * @param {Object} filters - Optional filters
 * @returns {Array} List of users
 */
function getUsers(filters = {}) {
  const db = getDatabase();
  
  let query = 'SELECT * FROM users WHERE 1=1';
  const params = [];
  
  if (filters.activeOnly !== false) {
    query += ' AND is_active = 1';
  }
  
  if (filters.role) {
    query += ' AND role = ?';
    params.push(filters.role);
  }
  
  if (filters.search) {
    query += ' AND (name LIKE ? OR email LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm);
  }
  
  query += ' ORDER BY name ASC';
  
  const users = db.prepare(query).all(...params);
  return users.map(formatUser);
}

/**
 * Get user by ID
 * @param {string} id - User ID
 * @returns {Object|null} User
 */
function getUserById(id) {
  const db = getDatabase();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return user ? formatUser(user) : null;
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Object|null} User
 */
function getUserByEmail(email) {
  const db = getDatabase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  return user ? formatUser(user) : null;
}

/**
 * Toggle user active status
 * @param {string} id - User ID
 * @param {string} [adminUserId] - Admin user making the change
 * @returns {Object} Updated user
 */
function toggleUserStatus(id, adminUserId = null) {
  const db = getDatabase();
  const user = db.prepare('SELECT is_active FROM users WHERE id = ?').get(id);
  
  if (!user) {
    throw new Error(`User ${id} not found`);
  }
  
  return updateUser(id, { isActive: !user.is_active }, adminUserId);
}

/**
 * Format user from DB row (excludes password)
 */
function formatUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    deviceId: row.device_id,
  };
}

module.exports = {
  createUser,
  updateUser,
  getUsers,
  getUserById,
  getUserByEmail,
  toggleUserStatus,
};
