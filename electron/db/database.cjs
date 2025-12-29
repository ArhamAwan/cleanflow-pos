const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const { v4: uuidv4 } = require('uuid');

/**
 * SQLite Database Manager
 * - Singleton pattern for single connection
 * - WAL mode for crash safety
 * - Foreign keys enabled
 * - Auto-creates DB in userData folder
 */

let db = null;
let deviceId = null;

/**
 * Get the database file path
 * In development: ./data/cleanflow.db
 * In production: userData/cleanflow.db
 */
function getDatabasePath() {
  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';
  
  if (isDev) {
    // Development: Store in project root/data folder
    return path.join(__dirname, '..', '..', 'data', 'cleanflow.db');
  } else {
    // Production: Store in user's app data folder
    return path.join(app.getPath('userData'), 'cleanflow.db');
  }
}

/**
 * Ensure the data directory exists
 */
function ensureDataDirectory() {
  const fs = require('fs');
  const dbPath = getDatabasePath();
  const dir = path.dirname(dbPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Initialize or get the database connection
 * @returns {Database} SQLite database instance
 */
function getDatabase() {
  if (db) {
    return db;
  }

  ensureDataDirectory();
  const dbPath = getDatabasePath();
  
  console.log('Opening database at:', dbPath);
  
  // Open database with WAL mode for crash safety
  db = new Database(dbPath);
  
  // Enable WAL mode for better crash recovery
  db.pragma('journal_mode = WAL');
  
  // Enable foreign keys for referential integrity
  db.pragma('foreign_keys = ON');
  
  // Improve performance while maintaining safety
  db.pragma('synchronous = NORMAL');
  
  // Initialize device ID if not exists
  initializeDeviceId();
  
  return db;
}

/**
 * Initialize or retrieve the device ID
 * Device ID is used for sync identification
 */
function initializeDeviceId() {
  try {
    // First, ensure the app_settings table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    
    // Try to get existing device ID
    const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('device_id');
    
    if (row) {
      deviceId = row.value;
    } else {
      // Generate new device ID
      deviceId = uuidv4();
      db.prepare(
        'INSERT INTO app_settings (key, value, created_at, updated_at) VALUES (?, ?, datetime("now"), datetime("now"))'
      ).run('device_id', deviceId);
    }
    
    console.log('Device ID:', deviceId);
  } catch (error) {
    console.error('Error initializing device ID:', error);
    // Fallback to generated ID
    deviceId = uuidv4();
  }
}

/**
 * Get the current device ID
 * @returns {string} Device UUID
 */
function getDeviceId() {
  if (!deviceId) {
    getDatabase(); // This will initialize deviceId
  }
  return deviceId;
}

/**
 * Close the database connection
 */
function closeDatabase() {
  if (db) {
    console.log('Closing database connection');
    db.close();
    db = null;
    deviceId = null;
  }
}

/**
 * Get current ISO timestamp
 * @returns {string} ISO 8601 timestamp
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

module.exports = {
  getDatabase,
  getDeviceId,
  closeDatabase,
  getCurrentTimestamp,
  getDatabasePath,
};
