const { getDatabase, getDeviceId, getCurrentTimestamp } = require('./database.cjs');

/**
 * Database Migrations
 * Creates all required tables with proper schema
 * Each table includes: id, created_at, updated_at, sync_status, device_id
 */

/**
 * Run all migrations
 */
function runMigrations() {
  const db = getDatabase();
  
  console.log('Running database migrations...');
  
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  
  // Run each migration if not already executed
  const migrations = [
    { name: '001_create_users', fn: createUsersTable },
    { name: '002_create_customers', fn: createCustomersTable },
    { name: '003_create_service_types', fn: createServiceTypesTable },
    { name: '004_create_jobs', fn: createJobsTable },
    { name: '005_create_payments', fn: createPaymentsTable },
    { name: '006_create_expenses', fn: createExpensesTable },
    { name: '007_create_ledger_entries', fn: createLedgerEntriesTable },
    { name: '008_create_audit_logs', fn: createAuditLogsTable },
    { name: '009_seed_default_data', fn: seedDefaultData },
  ];
  
  const checkMigration = db.prepare('SELECT id FROM migrations WHERE name = ?');
  const insertMigration = db.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, datetime("now"))');
  
  for (const migration of migrations) {
    const existing = checkMigration.get(migration.name);
    
    if (!existing) {
      console.log(`Running migration: ${migration.name}`);
      try {
        migration.fn(db);
        insertMigration.run(migration.name);
        console.log(`Migration ${migration.name} completed`);
      } catch (error) {
        console.error(`Migration ${migration.name} failed:`, error);
        throw error;
      }
    }
  }
  
  console.log('All migrations completed');
}

/**
 * Create users table
 */
function createUsersTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL CHECK(role IN ('admin', 'accountant', 'data_entry')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL
    )
  `);
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_sync_status ON users(sync_status)');
}

/**
 * Create customers table
 */
function createCustomersTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      outstanding_balance REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL
    )
  `);
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_customers_sync_status ON customers(sync_status)');
}

/**
 * Create service_types table
 */
function createServiceTypesTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS service_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL
    )
  `);
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_service_types_name ON service_types(name)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_service_types_sync_status ON service_types(sync_status)');
}

/**
 * Create jobs table
 */
function createJobsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('paid', 'partial', 'unpaid')),
      paid_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (service_id) REFERENCES service_types(id)
    )
  `);
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_jobs_service_id ON jobs(service_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(date)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_jobs_payment_status ON jobs(payment_status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_jobs_sync_status ON jobs(sync_status)');
}

/**
 * Create payments table
 */
function createPaymentsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('cash_in', 'cash_out')),
      amount REAL NOT NULL,
      method TEXT NOT NULL CHECK(method IN ('cash', 'bank')),
      customer_id TEXT,
      job_id TEXT,
      description TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    )
  `);
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_payments_job_id ON payments(job_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_payments_sync_status ON payments(sync_status)');
}

/**
 * Create expenses table
 */
function createExpensesTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      method TEXT NOT NULL CHECK(method IN ('cash', 'bank')),
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL
    )
  `);
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_expenses_sync_status ON expenses(sync_status)');
}

/**
 * Create ledger_entries table (IMMUTABLE)
 * This table stores all financial transactions for double-entry bookkeeping
 * Entries can NEVER be deleted or modified - corrections use adjustment entries
 */
function createLedgerEntriesTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id TEXT PRIMARY KEY,
      entry_type TEXT NOT NULL CHECK(entry_type IN (
        'JOB_CREATED',
        'PAYMENT_RECEIVED',
        'PAYMENT_MADE',
        'EXPENSE_RECORDED',
        'ADJUSTMENT',
        'OPENING_BALANCE'
      )),
      reference_type TEXT NOT NULL CHECK(reference_type IN ('job', 'payment', 'expense', 'customer', 'system')),
      reference_id TEXT NOT NULL,
      customer_id TEXT,
      description TEXT NOT NULL,
      debit REAL NOT NULL DEFAULT 0,
      credit REAL NOT NULL DEFAULT 0,
      balance REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_ledger_entries_entry_type ON ledger_entries(entry_type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference ON ledger_entries(reference_type, reference_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_ledger_entries_customer_id ON ledger_entries(customer_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_ledger_entries_sync_status ON ledger_entries(sync_status)');
  
  // Create trigger to prevent updates on ledger_entries
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS prevent_ledger_update
    BEFORE UPDATE ON ledger_entries
    BEGIN
      SELECT RAISE(ABORT, 'Ledger entries cannot be modified. Use adjustment entries instead.');
    END
  `);
  
  // Create trigger to prevent deletes on ledger_entries
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS prevent_ledger_delete
    BEFORE DELETE ON ledger_entries
    BEGIN
      SELECT RAISE(ABORT, 'Ledger entries cannot be deleted. Use adjustment entries instead.');
    END
  `);
}

/**
 * Create audit_logs table
 * Stores all data changes for audit trail
 */
function createAuditLogsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE')),
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      user_id TEXT,
      created_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL
    )
  `);
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_sync_status ON audit_logs(sync_status)');
}

/**
 * Seed default data
 */
function seedDefaultData(db) {
  const { v4: uuidv4 } = require('uuid');
  const deviceId = getDeviceId();
  const now = getCurrentTimestamp();
  
  // Create default admin user
  const adminId = uuidv4();
  db.prepare(`
    INSERT INTO users (id, name, email, role, is_active, created_at, updated_at, sync_status, device_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(adminId, 'Admin User', 'admin@cleanflow.local', 'admin', 1, now, now, 'PENDING', deviceId);
  
  // Create default service types
  const services = [
    { name: 'Wash & Iron', description: 'Full wash and iron service', price: 150 },
    { name: 'Dry Clean', description: 'Professional dry cleaning', price: 300 },
    { name: 'Iron Only', description: 'Ironing service only', price: 50 },
    { name: 'Wash Only', description: 'Washing service only', price: 100 },
    { name: 'Premium Wash', description: 'Premium fabric care', price: 400 },
  ];
  
  const insertService = db.prepare(`
    INSERT INTO service_types (id, name, description, price, is_active, created_at, updated_at, sync_status, device_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const service of services) {
    insertService.run(
      uuidv4(),
      service.name,
      service.description,
      service.price,
      1,
      now,
      now,
      'PENDING',
      deviceId
    );
  }
  
  console.log('Default data seeded successfully');
}

module.exports = {
  runMigrations,
};
