const {
  getDatabase,
  getDeviceId,
  getCurrentTimestamp,
} = require("./database.cjs");

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

  console.log("Running database migrations...");

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
    { name: "001_create_users", fn: createUsersTable },
    { name: "002_create_customers", fn: createCustomersTable },
    { name: "003_create_service_types", fn: createServiceTypesTable },
    { name: "004_create_jobs", fn: createJobsTable },
    { name: "005_create_payments", fn: createPaymentsTable },
    { name: "006_create_expenses", fn: createExpensesTable },
    { name: "007_create_ledger_entries", fn: createLedgerEntriesTable },
    { name: "008_create_audit_logs", fn: createAuditLogsTable },
    { name: "009_seed_default_data", fn: seedDefaultData },
    { name: "010_create_items", fn: createItemsTable },
    { name: "011_create_item_variants", fn: createItemVariantsTable },
    { name: "012_create_warehouses", fn: createWarehousesTable },
    { name: "013_create_stock_transactions", fn: createStockTransactionsTable },
    { name: "014_create_stock_levels", fn: createStockLevelsTable },
    { name: "015_create_low_stock_alerts", fn: createLowStockAlertsTable },
    { name: "016_seed_inventory_data", fn: seedInventoryData },
    { name: "017_create_company_settings", fn: createCompanySettingsTable },
    { name: "018_create_invoice_templates", fn: createInvoiceTemplatesTable },
    { name: "019_create_invoices", fn: createInvoicesTable },
    { name: "020_create_invoice_items", fn: createInvoiceItemsTable },
    { name: "021_create_estimates", fn: createEstimatesTable },
    { name: "022_create_estimate_items", fn: createEstimateItemsTable },
    { name: "023_create_delivery_challans", fn: createDeliveryChallansTable },
    { name: "024_create_challan_items", fn: createChallanItemsTable },
    { name: "025_create_tax_rates", fn: createTaxRatesTable },
    { name: "026_create_invoice_taxes", fn: createInvoiceTaxesTable },
    { name: "027_create_tax_returns", fn: createTaxReturnsTable },
    { name: "028_seed_invoice_data", fn: seedInvoiceData },
    { name: "029_update_ledger_entries_schema", fn: updateLedgerEntriesSchema },
    { name: "030_add_reorder_quantity", fn: addReorderQuantityToStockLevels },
    { name: "031_add_valuation_fields", fn: addValuationFields },
    { name: "032_create_inventory_valuations", fn: createInventoryValuationsTable },
  ];

  const checkMigration = db.prepare("SELECT id FROM migrations WHERE name = ?");
  const insertMigration = db.prepare(
    "INSERT INTO migrations (name, executed_at) VALUES (?, datetime('now'))"
  );

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

  console.log("All migrations completed");
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

  db.exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_users_sync_status ON users(sync_status)"
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id)");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)"
  );
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

  db.exec("CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_customers_sync_status ON customers(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_customers_device_id ON customers(device_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at)"
  );
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

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_service_types_name ON service_types(name)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_service_types_sync_status ON service_types(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_service_types_device_id ON service_types(device_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_service_types_created_at ON service_types(created_at)"
  );
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

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id)"
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_jobs_service_id ON jobs(service_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(date)");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_jobs_payment_status ON jobs(payment_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_jobs_sync_status ON jobs(sync_status)"
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_jobs_device_id ON jobs(device_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at)");
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

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)"
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_payments_job_id ON payments(job_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type)");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_payments_sync_status ON payments(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_payments_device_id ON payments(device_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at)"
  );
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

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)"
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_expenses_sync_status ON expenses(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_expenses_device_id ON expenses(device_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at)"
  );
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
        'INVOICE_CREATED',
        'PAYMENT_RECEIVED',
        'PAYMENT_MADE',
        'EXPENSE_RECORDED',
        'ADJUSTMENT',
        'OPENING_BALANCE'
      )),
      reference_type TEXT NOT NULL CHECK(reference_type IN ('job', 'invoice', 'estimate', 'challan', 'payment', 'expense', 'customer', 'system')),
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

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_ledger_entries_entry_type ON ledger_entries(entry_type)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference ON ledger_entries(reference_type, reference_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_ledger_entries_customer_id ON ledger_entries(customer_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_ledger_entries_sync_status ON ledger_entries(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_ledger_entries_device_id ON ledger_entries(device_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON ledger_entries(created_at)"
  );

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

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_sync_status ON audit_logs(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_device_id ON audit_logs(device_id)"
  );
}

/**
 * Seed default data
 * Creates comprehensive mock data for testing:
 * - Admin user
 * - Service types (5)
 * - Customers (8)
 * - Jobs (10)
 * - Payments (10)
 * - Expenses (7)
 */
function seedDefaultData(db) {
  const { v4: uuidv4 } = require("uuid");
  const deviceId = getDeviceId();
  const now = getCurrentTimestamp();

  // Create default admin user
  const adminId = uuidv4();
  db.prepare(
    `
    INSERT INTO users (id, name, email, role, is_active, created_at, updated_at, sync_status, device_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    adminId,
    "Admin User",
    "admin@cleanflow.local",
    "admin",
    1,
    now,
    now,
    "PENDING",
    deviceId
  );

  // Create default service types
  const services = [
    {
      name: "Wash & Iron",
      description: "Full wash and iron service",
      price: 150,
    },
    { name: "Dry Clean", description: "Professional dry cleaning", price: 300 },
    { name: "Iron Only", description: "Ironing service only", price: 50 },
    { name: "Wash Only", description: "Washing service only", price: 100 },
    { name: "Premium Wash", description: "Premium fabric care", price: 400 },
  ];

  const insertService = db.prepare(`
    INSERT INTO service_types (id, name, description, price, is_active, created_at, updated_at, sync_status, device_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const serviceIds = [];
  for (const service of services) {
    const serviceId = uuidv4();
    serviceIds.push({ id: serviceId, ...service });
    insertService.run(
      serviceId,
      service.name,
      service.description,
      service.price,
      1,
      now,
      now,
      "PENDING",
      deviceId
    );
  }

  // Create mock customers
  const customers = [
    {
      name: "Ahmed Ali",
      phone: "0300-1234567",
      address: "Gulshan-e-Iqbal, Karachi",
      outstandingBalance: 2500,
    },
    {
      name: "Fatima Khan",
      phone: "0312-2345678",
      address: "DHA Phase 5, Karachi",
      outstandingBalance: 1500,
    },
    {
      name: "Hassan Raza",
      phone: "0333-3456789",
      address: "Clifton, Karachi",
      outstandingBalance: 0,
    },
    {
      name: "Ayesha Malik",
      phone: "0345-4567890",
      address: "PECHS, Karachi",
      outstandingBalance: 3200,
    },
    {
      name: "Bilal Ahmed",
      phone: "0301-5678901",
      address: "North Nazimabad, Karachi",
      outstandingBalance: 800,
    },
    {
      name: "Sana Sheikh",
      phone: "0321-6789012",
      address: "Malir, Karachi",
      outstandingBalance: 0,
    },
    {
      name: "Usman Ali",
      phone: "0331-7890123",
      address: "Korangi, Karachi",
      outstandingBalance: 4500,
    },
    {
      name: "Zainab Hassan",
      phone: "0341-8901234",
      address: "Saddar, Karachi",
      outstandingBalance: 1200,
    },
  ];

  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, name, phone, address, outstanding_balance, created_at, updated_at, sync_status, device_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `);

  const customerIds = [];
  for (const customer of customers) {
    const customerId = uuidv4();
    customerIds.push({ id: customerId, ...customer });
    insertCustomer.run(
      customerId,
      customer.name,
      customer.phone,
      customer.address,
      customer.outstandingBalance,
      now,
      now,
      deviceId
    );
  }

  // Create mock jobs
  const insertJob = db.prepare(`
    INSERT INTO jobs (
      id, customer_id, service_id, date, amount,
      payment_status, paid_amount, notes,
      created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `);

  const jobIds = [];
  const today = new Date();
  const jobs = [
    {
      customerIndex: 0,
      serviceIndex: 0,
      daysAgo: 0,
      amount: 450,
      paymentStatus: "paid",
      paidAmount: 450,
    },
    {
      customerIndex: 1,
      serviceIndex: 1,
      daysAgo: 0,
      amount: 900,
      paymentStatus: "partial",
      paidAmount: 500,
    },
    {
      customerIndex: 2,
      serviceIndex: 2,
      daysAgo: 1,
      amount: 150,
      paymentStatus: "paid",
      paidAmount: 150,
    },
    {
      customerIndex: 3,
      serviceIndex: 0,
      daysAgo: 1,
      amount: 300,
      paymentStatus: "unpaid",
      paidAmount: 0,
    },
    {
      customerIndex: 4,
      serviceIndex: 3,
      daysAgo: 2,
      amount: 200,
      paymentStatus: "paid",
      paidAmount: 200,
    },
    {
      customerIndex: 5,
      serviceIndex: 4,
      daysAgo: 2,
      amount: 800,
      paymentStatus: "paid",
      paidAmount: 800,
    },
    {
      customerIndex: 6,
      serviceIndex: 1,
      daysAgo: 3,
      amount: 600,
      paymentStatus: "partial",
      paidAmount: 300,
    },
    {
      customerIndex: 7,
      serviceIndex: 0,
      daysAgo: 3,
      amount: 450,
      paymentStatus: "unpaid",
      paidAmount: 0,
    },
    {
      customerIndex: 0,
      serviceIndex: 2,
      daysAgo: 4,
      amount: 100,
      paymentStatus: "paid",
      paidAmount: 100,
    },
    {
      customerIndex: 1,
      serviceIndex: 0,
      daysAgo: 5,
      amount: 300,
      paymentStatus: "paid",
      paidAmount: 300,
    },
  ];

  for (const job of jobs) {
    const jobId = uuidv4();
    const jobDate = new Date(today);
    jobDate.setDate(jobDate.getDate() - job.daysAgo);
    const jobDateStr = jobDate.toISOString().split("T")[0];

    jobIds.push(jobId);
    insertJob.run(
      jobId,
      customerIds[job.customerIndex].id,
      serviceIds[job.serviceIndex].id,
      jobDateStr,
      job.amount,
      job.paymentStatus,
      job.paidAmount,
      `Service for ${customerIds[job.customerIndex].name}`,
      now,
      now,
      deviceId
    );
  }

  // Create mock payments
  const insertPayment = db.prepare(`
    INSERT INTO payments (
      id, type, amount, method, customer_id, job_id, description, date,
      created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `);

  const paymentDates = [
    {
      daysAgo: 0,
      type: "cash_in",
      amount: 500,
      method: "cash",
      customerIndex: 1,
      jobIndex: 1,
    },
    {
      daysAgo: 0,
      type: "cash_in",
      amount: 450,
      method: "bank",
      customerIndex: 0,
      jobIndex: 0,
    },
    {
      daysAgo: 1,
      type: "cash_in",
      amount: 150,
      method: "cash",
      customerIndex: 2,
      jobIndex: 2,
    },
    {
      daysAgo: 1,
      type: "cash_in",
      amount: 200,
      method: "cash",
      customerIndex: 4,
      jobIndex: 4,
    },
    {
      daysAgo: 2,
      type: "cash_in",
      amount: 800,
      method: "bank",
      customerIndex: 5,
      jobIndex: 5,
    },
    {
      daysAgo: 2,
      type: "cash_in",
      amount: 300,
      method: "cash",
      customerIndex: 6,
      jobIndex: 6,
    },
    {
      daysAgo: 3,
      type: "cash_in",
      amount: 100,
      method: "cash",
      customerIndex: 0,
      jobIndex: 8,
    },
    {
      daysAgo: 5,
      type: "cash_in",
      amount: 300,
      method: "bank",
      customerIndex: 1,
      jobIndex: 9,
    },
    {
      daysAgo: 0,
      type: "cash_out",
      amount: 500,
      method: "cash",
      description: "Daily expenses withdrawal",
    },
    {
      daysAgo: 1,
      type: "cash_out",
      amount: 300,
      method: "bank",
      description: "Supplier payment",
    },
  ];

  for (const payment of paymentDates) {
    const paymentDate = new Date(today);
    paymentDate.setDate(paymentDate.getDate() - payment.daysAgo);
    const paymentDateStr = paymentDate.toISOString().split("T")[0];

    insertPayment.run(
      uuidv4(),
      payment.type,
      payment.amount,
      payment.method,
      payment.customerIndex !== undefined
        ? customerIds[payment.customerIndex].id
        : null,
      payment.jobIndex !== undefined ? jobIds[payment.jobIndex] : null,
      payment.description ||
        `Payment for ${customerIds[payment.customerIndex].name}`,
      paymentDateStr,
      now,
      now,
      deviceId
    );
  }

  // Create mock expenses
  const insertExpense = db.prepare(`
    INSERT INTO expenses (
      id, category, amount, description, method, date,
      created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `);

  const expenses = [
    {
      category: "Supplies",
      amount: 500,
      description: "Detergent and cleaning supplies",
      method: "cash",
      daysAgo: 0,
    },
    {
      category: "Utilities",
      amount: 2500,
      description: "Electricity bill",
      method: "bank",
      daysAgo: 2,
    },
    {
      category: "Transportation",
      amount: 800,
      description: "Fuel for delivery",
      method: "cash",
      daysAgo: 1,
    },
    {
      category: "Maintenance",
      amount: 1200,
      description: "Washing machine repair",
      method: "bank",
      daysAgo: 3,
    },
    {
      category: "Staff Salary",
      amount: 15000,
      description: "Monthly staff salary",
      method: "bank",
      daysAgo: 5,
    },
    {
      category: "Office Expenses",
      amount: 300,
      description: "Stationery and office supplies",
      method: "cash",
      daysAgo: 0,
    },
    {
      category: "Equipment",
      amount: 3500,
      description: "New ironing board",
      method: "bank",
      daysAgo: 7,
    },
  ];

  for (const expense of expenses) {
    const expenseDate = new Date(today);
    expenseDate.setDate(expenseDate.getDate() - expense.daysAgo);
    const expenseDateStr = expenseDate.toISOString().split("T")[0];

    insertExpense.run(
      uuidv4(),
      expense.category,
      expense.amount,
      expense.description,
      expense.method,
      expenseDateStr,
      now,
      now,
      deviceId
    );
  }

  console.log("Default data seeded successfully");
}

/**
 * Create items table
 */
function createItemsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT,
      barcode TEXT,
      category TEXT,
      unit TEXT NOT NULL CHECK(unit IN ('piece', 'kg', 'liter', 'meter', 'box', 'pack')),
      purchase_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      image_url TEXT,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL
    )
  `);

  db.exec("CREATE INDEX IF NOT EXISTS idx_items_name ON items(name)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_items_is_active ON items(is_active)");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_items_sync_status ON items(sync_status)"
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_items_device_id ON items(device_id)");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at)"
  );
}

/**
 * Create item_variants table
 */
function createItemVariantsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS item_variants (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      variant_type TEXT NOT NULL CHECK(variant_type IN ('batch', 'size', 'color', 'expiry', 'serial')),
      variant_value TEXT NOT NULL,
      barcode TEXT,
      purchase_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      stock_quantity REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id)
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_item_variants_item_id ON item_variants(item_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_item_variants_barcode ON item_variants(barcode)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_item_variants_variant_type ON item_variants(variant_type)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_item_variants_sync_status ON item_variants(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_item_variants_device_id ON item_variants(device_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_item_variants_created_at ON item_variants(created_at)"
  );
}

/**
 * Create warehouses table
 */
function createWarehousesTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL
    )
  `);

  db.exec("CREATE INDEX IF NOT EXISTS idx_warehouses_name ON warehouses(name)");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_warehouses_is_default ON warehouses(is_default)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_warehouses_is_active ON warehouses(is_active)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_warehouses_sync_status ON warehouses(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_warehouses_device_id ON warehouses(device_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_warehouses_created_at ON warehouses(created_at)"
  );
}

/**
 * Create stock_transactions table
 */
function createStockTransactionsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_transactions (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      variant_id TEXT,
      warehouse_id TEXT NOT NULL,
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'TRANSFER')),
      quantity REAL NOT NULL,
      reference_type TEXT CHECK(reference_type IN ('invoice', 'purchase_order', 'transfer', 'adjustment')),
      reference_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (variant_id) REFERENCES item_variants(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_stock_transactions_item_id ON stock_transactions(item_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_stock_transactions_variant_id ON stock_transactions(variant_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_stock_transactions_warehouse_id ON stock_transactions(warehouse_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_stock_transactions_transaction_type ON stock_transactions(transaction_type)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_stock_transactions_reference ON stock_transactions(reference_type, reference_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_stock_transactions_date ON stock_transactions(created_at)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_stock_transactions_sync_status ON stock_transactions(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_stock_transactions_device_id ON stock_transactions(device_id)"
  );
}

/**
 * Create stock_levels table
 */
function createStockLevelsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_levels (
      item_id TEXT NOT NULL,
      variant_id TEXT NOT NULL DEFAULT '',
      warehouse_id TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      reserved_quantity REAL NOT NULL DEFAULT 0,
      low_stock_threshold REAL NOT NULL DEFAULT 0,
      last_updated TEXT NOT NULL,
      PRIMARY KEY (item_id, variant_id, warehouse_id),
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_stock_levels_item_id ON stock_levels(item_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_stock_levels_variant_id ON stock_levels(variant_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_stock_levels_warehouse_id ON stock_levels(warehouse_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_stock_levels_quantity ON stock_levels(quantity)"
  );
}

/**
 * Create low_stock_alerts table
 */
function createLowStockAlertsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS low_stock_alerts (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      variant_id TEXT NOT NULL DEFAULT '',
      warehouse_id TEXT NOT NULL,
      current_quantity REAL NOT NULL,
      threshold REAL NOT NULL,
      alert_sent_at TEXT,
      is_resolved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_item_id ON low_stock_alerts(item_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_variant_id ON low_stock_alerts(variant_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_warehouse_id ON low_stock_alerts(warehouse_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_is_resolved ON low_stock_alerts(is_resolved)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_sync_status ON low_stock_alerts(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_device_id ON low_stock_alerts(device_id)"
  );
}

/**
 * Seed inventory mock data
 */
function seedInventoryData(db) {
  const { v4: uuidv4 } = require("uuid");
  const deviceId = getDeviceId();
  const now = getCurrentTimestamp();

  // Create default warehouse
  const warehouseId = uuidv4();
  db.prepare(
    `
    INSERT INTO warehouses (id, name, address, is_default, is_active, created_at, updated_at, sync_status, device_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `
  ).run(
    warehouseId,
    "Main Warehouse",
    "Karachi, Pakistan",
    1,
    1,
    now,
    now,
    deviceId
  );

  // Create additional warehouse
  const warehouse2Id = uuidv4();
  db.prepare(
    `
    INSERT INTO warehouses (id, name, address, is_default, is_active, created_at, updated_at, sync_status, device_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `
  ).run(
    warehouse2Id,
    "Branch Warehouse",
    "Lahore, Pakistan",
    0,
    1,
    now,
    now,
    deviceId
  );

  // Sample inventory items
  const items = [
    {
      name: "Detergent Powder",
      sku: "DET-001",
      barcode: "1234567890123",
      category: "Cleaning Supplies",
      unit: "kg",
      purchasePrice: 250,
      sellingPrice: 350,
      taxRate: 17,
      description: "Premium quality detergent powder",
    },
    {
      name: "Fabric Softener",
      sku: "FS-001",
      barcode: "1234567890124",
      category: "Cleaning Supplies",
      unit: "liter",
      purchasePrice: 180,
      sellingPrice: 280,
      taxRate: 17,
      description: "Fabric softener for clothes",
    },
    {
      name: "Starch Spray",
      sku: "ST-001",
      barcode: "1234567890125",
      category: "Cleaning Supplies",
      unit: "piece",
      purchasePrice: 120,
      sellingPrice: 200,
      taxRate: 17,
      description: "Starch spray for ironing",
    },
    {
      name: "Hanger Set",
      sku: "HNG-001",
      barcode: "1234567890126",
      category: "Accessories",
      unit: "pack",
      purchasePrice: 150,
      sellingPrice: 250,
      taxRate: 17,
      description: "Set of 10 hangers",
    },
    {
      name: "Dry Cleaning Solvent",
      sku: "DCS-001",
      barcode: "1234567890127",
      category: "Cleaning Supplies",
      unit: "liter",
      purchasePrice: 800,
      sellingPrice: 1200,
      taxRate: 17,
      description: "Professional dry cleaning solvent",
    },
    {
      name: "Ironing Board",
      sku: "IB-001",
      barcode: "1234567890128",
      category: "Equipment",
      unit: "piece",
      purchasePrice: 2500,
      sellingPrice: 3500,
      taxRate: 17,
      description: "Adjustable ironing board",
    },
    {
      name: "Laundry Bag",
      sku: "LB-001",
      barcode: "1234567890129",
      category: "Accessories",
      unit: "piece",
      purchasePrice: 200,
      sellingPrice: 350,
      taxRate: 17,
      description: "Reusable laundry bag",
    },
    {
      name: "Bleach",
      sku: "BL-001",
      barcode: "1234567890130",
      category: "Cleaning Supplies",
      unit: "liter",
      purchasePrice: 100,
      sellingPrice: 180,
      taxRate: 17,
      description: "Chlorine bleach for white clothes",
    },
    {
      name: "Washing Machine Filter",
      sku: "WMF-001",
      barcode: "1234567890131",
      category: "Equipment",
      unit: "piece",
      purchasePrice: 500,
      sellingPrice: 800,
      taxRate: 17,
      description: "Replacement filter for washing machine",
    },
    {
      name: "Garment Cover",
      sku: "GC-001",
      barcode: "1234567890132",
      category: "Accessories",
      unit: "box",
      purchasePrice: 300,
      sellingPrice: 500,
      taxRate: 17,
      description: "Plastic garment covers (50 pieces)",
    },
  ];

  // Check if valuation_method column exists
  const itemsTableInfo = db.prepare("PRAGMA table_info(items)").all();
  const hasValuationMethod = itemsTableInfo.some(col => col.name === 'valuation_method');
  
  // Build INSERT statement based on whether valuation_method column exists
  let insertItem;
  if (hasValuationMethod) {
    insertItem = db.prepare(`
      INSERT INTO items (
        id, name, sku, barcode, category, unit,
        purchase_price, selling_price, tax_rate,
        is_active, description, valuation_method,
        created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `);
  } else {
    insertItem = db.prepare(`
      INSERT INTO items (
        id, name, sku, barcode, category, unit,
        purchase_price, selling_price, tax_rate,
        is_active, description,
        created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `);
  }

  const itemIds = [];
  const valuationMethods = ['FIFO', 'LIFO', 'WEIGHTED_AVERAGE', 'FIFO', 'LIFO', 'WEIGHTED_AVERAGE', 'FIFO', 'LIFO', 'WEIGHTED_AVERAGE', 'FIFO'];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemId = uuidv4();
    const valuationMethod = valuationMethods[i] || 'FIFO';
    itemIds.push({ id: itemId, ...item, valuationMethod });
    
    if (hasValuationMethod) {
      insertItem.run(
        itemId,
        item.name,
        item.sku,
        item.barcode,
        item.category,
        item.unit,
        item.purchasePrice,
        item.sellingPrice,
        item.taxRate,
        1,
        item.description,
        valuationMethod,
        now,
        now,
        deviceId
      );
    } else {
      insertItem.run(
        itemId,
        item.name,
        item.sku,
        item.barcode,
        item.category,
        item.unit,
        item.purchasePrice,
        item.sellingPrice,
        item.taxRate,
        1,
        item.description,
        now,
        now,
        deviceId
      );
    }
  }

  // Check if reorder_quantity column exists
  const stockLevelsTableInfo = db.prepare("PRAGMA table_info(stock_levels)").all();
  const hasReorderQuantity = stockLevelsTableInfo.some(col => col.name === 'reorder_quantity');
  
  // Build INSERT statement based on whether reorder_quantity column exists
  let insertStockLevel;
  if (hasReorderQuantity) {
    insertStockLevel = db.prepare(`
      INSERT INTO stock_levels (
        item_id, variant_id, warehouse_id,
        quantity, reserved_quantity, low_stock_threshold, reorder_quantity, last_updated
      )
      VALUES (?, ?, ?, ?, 0, ?, ?, ?)
    `);
  } else {
    insertStockLevel = db.prepare(`
      INSERT INTO stock_levels (
        item_id, variant_id, warehouse_id,
        quantity, reserved_quantity, low_stock_threshold, last_updated
      )
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `);
  }

  // Add stock for items in main warehouse
  // Some items will have low stock to test reorder alerts
  const stockLevels = [
    { itemIndex: 0, quantity: 8, threshold: 10, reorderQty: 50 }, // Detergent - LOW STOCK
    { itemIndex: 1, quantity: 3, threshold: 5, reorderQty: 30 }, // Fabric Softener - LOW STOCK
    { itemIndex: 2, quantity: 4, threshold: 5, reorderQty: 25 }, // Starch - LOW STOCK
    { itemIndex: 3, quantity: 100, threshold: 20, reorderQty: 50 }, // Hangers - Good stock
    { itemIndex: 4, quantity: 2, threshold: 3, reorderQty: 15 }, // Dry Cleaning Solvent - LOW STOCK
    { itemIndex: 5, quantity: 1, threshold: 2, reorderQty: 5 }, // Ironing Board - LOW STOCK
    { itemIndex: 6, quantity: 40, threshold: 10, reorderQty: 30 }, // Laundry Bag - Good stock
    { itemIndex: 7, quantity: 4, threshold: 5, reorderQty: 20 }, // Bleach - LOW STOCK
    { itemIndex: 8, quantity: 1, threshold: 2, reorderQty: 10 }, // Filter - LOW STOCK
    { itemIndex: 9, quantity: 2, threshold: 3, reorderQty: 12 }, // Garment Cover - LOW STOCK
  ];

  for (const stock of stockLevels) {
    if (hasReorderQuantity) {
      insertStockLevel.run(
        itemIds[stock.itemIndex].id,
        "",
        warehouseId,
        stock.quantity,
        stock.threshold,
        stock.reorderQty,
        now
      );
    } else {
      insertStockLevel.run(
        itemIds[stock.itemIndex].id,
        "",
        warehouseId,
        stock.quantity,
        stock.threshold,
        now
      );
    }
  }

  // Add some stock to branch warehouse (some low stock items)
  if (hasReorderQuantity) {
    insertStockLevel.run(itemIds[0].id, "", warehouse2Id, 5, 10, 50, now); // LOW STOCK
    insertStockLevel.run(itemIds[1].id, "", warehouse2Id, 2, 5, 30, now); // LOW STOCK
    insertStockLevel.run(itemIds[2].id, "", warehouse2Id, 15, 5, 25, now); // Good stock
  } else {
    insertStockLevel.run(itemIds[0].id, "", warehouse2Id, 5, 10, now); // LOW STOCK
    insertStockLevel.run(itemIds[1].id, "", warehouse2Id, 2, 5, now); // LOW STOCK
    insertStockLevel.run(itemIds[2].id, "", warehouse2Id, 15, 5, now); // Good stock
  }

  // Check if unit_cost column exists
  const transactionsTableInfo = db.prepare("PRAGMA table_info(stock_transactions)").all();
  const hasUnitCost = transactionsTableInfo.some(col => col.name === 'unit_cost');
  
  // Build INSERT statement based on whether unit_cost column exists
  let insertTransaction;
  if (hasUnitCost) {
    insertTransaction = db.prepare(`
      INSERT INTO stock_transactions (
        id, item_id, variant_id, warehouse_id,
        transaction_type, quantity, unit_cost,
        reference_type, reference_id, notes,
        created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `);
  } else {
    insertTransaction = db.prepare(`
      INSERT INTO stock_transactions (
        id, item_id, variant_id, warehouse_id,
        transaction_type, quantity,
        reference_type, reference_id, notes,
        created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `);
  }

  // Add comprehensive purchase and sale transactions with unit costs for valuation testing
  const transactions = [
    // Purchase transactions with unit costs (for FIFO/LIFO testing)
    {
      itemIndex: 0,
      warehouseId: warehouseId,
      type: "PURCHASE",
      quantity: 50,
      unitCost: 250, // Original purchase price
      notes: "Initial stock purchase",
      daysAgo: 60,
    },
    {
      itemIndex: 0,
      warehouseId: warehouseId,
      type: "PURCHASE",
      quantity: 30,
      unitCost: 240, // Lower price (for FIFO/LIFO testing)
      notes: "Bulk purchase - discounted",
      daysAgo: 30,
    },
    {
      itemIndex: 0,
      warehouseId: warehouseId,
      type: "PURCHASE",
      quantity: 20,
      unitCost: 245, // Medium price
      notes: "Monthly restock",
      daysAgo: 15,
    },
    {
      itemIndex: 1,
      warehouseId: warehouseId,
      type: "PURCHASE",
      quantity: 30,
      unitCost: 180,
      notes: "Initial purchase",
      daysAgo: 45,
    },
    {
      itemIndex: 1,
      warehouseId: warehouseId,
      type: "PURCHASE",
      quantity: 20,
      unitCost: 175, // Lower price
      notes: "Restock",
      daysAgo: 20,
    },
    {
      itemIndex: 2,
      warehouseId: warehouseId,
      type: "PURCHASE",
      quantity: 25,
      unitCost: 120,
      notes: "Bulk purchase",
      daysAgo: 30,
    },
    {
      itemIndex: 2,
      warehouseId: warehouseId,
      type: "PURCHASE",
      quantity: 15,
      unitCost: 115,
      notes: "Additional stock",
      daysAgo: 10,
    },
    {
      itemIndex: 3,
      warehouseId: warehouseId,
      type: "PURCHASE",
      quantity: 100,
      unitCost: 150,
      notes: "Bulk purchase",
      daysAgo: 20,
    },
    {
      itemIndex: 4,
      warehouseId: warehouseId,
      type: "PURCHASE",
      quantity: 15,
      unitCost: 800,
      notes: "Professional grade",
      daysAgo: 25,
    },
    {
      itemIndex: 5,
      warehouseId: warehouseId,
      type: "PURCHASE",
      quantity: 5,
      unitCost: 2500,
      notes: "Equipment purchase",
      daysAgo: 40,
    },
    {
      itemIndex: 6,
      warehouseId: warehouseId,
      type: "PURCHASE",
      quantity: 40,
      unitCost: 200,
      notes: "Bulk order",
      daysAgo: 18,
    },
    {
      itemIndex: 7,
      warehouseId: warehouseId,
      type: "PURCHASE",
      quantity: 20,
      unitCost: 100,
      notes: "Standard purchase",
      daysAgo: 22,
    },
    {
      itemIndex: 8,
      warehouseId: warehouseId,
      type: "PURCHASE",
      quantity: 8,
      unitCost: 500,
      notes: "Replacement parts",
      daysAgo: 35,
    },
    {
      itemIndex: 9,
      warehouseId: warehouseId,
      type: "PURCHASE",
      quantity: 12,
      unitCost: 300,
      notes: "Packaging supplies",
      daysAgo: 28,
    },
    // Sale transactions (no unit cost needed for sales)
    {
      itemIndex: 0,
      warehouseId: warehouseId,
      type: "SALE",
      quantity: 5,
      unitCost: null,
      notes: "Sale to customer",
      daysAgo: 5,
    },
    {
      itemIndex: 0,
      warehouseId: warehouseId,
      type: "SALE",
      quantity: 8,
      unitCost: null,
      notes: "Sale to customer",
      daysAgo: 3,
    },
    {
      itemIndex: 0,
      warehouseId: warehouseId,
      type: "SALE",
      quantity: 12,
      unitCost: null,
      notes: "Bulk sale",
      daysAgo: 1,
    },
    {
      itemIndex: 1,
      warehouseId: warehouseId,
      type: "SALE",
      quantity: 3,
      unitCost: null,
      notes: "Sale to customer",
      daysAgo: 4,
    },
    {
      itemIndex: 1,
      warehouseId: warehouseId,
      type: "SALE",
      quantity: 5,
      unitCost: null,
      notes: "Sale to customer",
      daysAgo: 2,
    },
    {
      itemIndex: 2,
      warehouseId: warehouseId,
      type: "SALE",
      quantity: 10,
      unitCost: null,
      notes: "Sale to customer",
      daysAgo: 6,
    },
    {
      itemIndex: 2,
      warehouseId: warehouseId,
      type: "SALE",
      quantity: 8,
      unitCost: null,
      notes: "Sale to customer",
      daysAgo: 4,
    },
    {
      itemIndex: 3,
      warehouseId: warehouseId,
      type: "SALE",
      quantity: 20,
      unitCost: null,
      notes: "Bulk sale",
      daysAgo: 8,
    },
    {
      itemIndex: 4,
      warehouseId: warehouseId,
      type: "SALE",
      quantity: 2,
      unitCost: null,
      notes: "Sale to customer",
      daysAgo: 7,
    },
    {
      itemIndex: 5,
      warehouseId: warehouseId,
      type: "SALE",
      quantity: 1,
      unitCost: null,
      notes: "Sale to customer",
      daysAgo: 12,
    },
    {
      itemIndex: 6,
      warehouseId: warehouseId,
      type: "SALE",
      quantity: 15,
      unitCost: null,
      notes: "Sale to customer",
      daysAgo: 9,
    },
    {
      itemIndex: 7,
      warehouseId: warehouseId,
      type: "SALE",
      quantity: 8,
      unitCost: null,
      notes: "Sale to customer",
      daysAgo: 5,
    },
    {
      itemIndex: 7,
      warehouseId: warehouseId,
      type: "SALE",
      quantity: 5,
      unitCost: null,
      notes: "Sale to customer",
      daysAgo: 3,
    },
    {
      itemIndex: 8,
      warehouseId: warehouseId,
      type: "SALE",
      quantity: 3,
      unitCost: null,
      notes: "Sale to customer",
      daysAgo: 10,
    },
    {
      itemIndex: 9,
      warehouseId: warehouseId,
      type: "SALE",
      quantity: 4,
      unitCost: null,
      notes: "Sale to customer",
      daysAgo: 6,
    },
    // Transfer transaction
    {
      itemIndex: 0,
      warehouseId: warehouseId,
      warehouse2Id: warehouse2Id,
      type: "TRANSFER",
      quantity: 20,
      unitCost: null,
      notes: "Transfer to branch warehouse",
      daysAgo: 7,
    },
  ];

  for (const txn of transactions) {
    const txnId = uuidv4();
    const txnDate = new Date();
    txnDate.setDate(txnDate.getDate() - txn.daysAgo);
    const txnTimestamp = txnDate
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);

    if (txn.type === "TRANSFER") {
      // Transfer: remove from source, add to destination
      if (hasUnitCost) {
        insertTransaction.run(
          uuidv4(),
          itemIds[txn.itemIndex].id,
          null,
          txn.warehouseId,
          "TRANSFER",
          -txn.quantity,
          null,
          "transfer",
          txnId,
          txn.notes,
          txnTimestamp,
          txnTimestamp,
          deviceId
        );
        insertTransaction.run(
          uuidv4(),
          itemIds[txn.itemIndex].id,
          null,
          txn.warehouse2Id,
          "TRANSFER",
          txn.quantity,
          null,
          "transfer",
          txnId,
          `Received from main warehouse`,
          txnTimestamp,
          txnTimestamp,
          deviceId
        );
      } else {
        insertTransaction.run(
          uuidv4(),
          itemIds[txn.itemIndex].id,
          null,
          txn.warehouseId,
          "TRANSFER",
          -txn.quantity,
          "transfer",
          txnId,
          txn.notes,
          txnTimestamp,
          txnTimestamp,
          deviceId
        );
        insertTransaction.run(
          uuidv4(),
          itemIds[txn.itemIndex].id,
          null,
          txn.warehouse2Id,
          "TRANSFER",
          txn.quantity,
          "transfer",
          txnId,
          `Received from main warehouse`,
          txnTimestamp,
          txnTimestamp,
          deviceId
        );
      }
    } else {
      if (hasUnitCost) {
        insertTransaction.run(
          txnId,
          itemIds[txn.itemIndex].id,
          null,
          txn.warehouseId,
          txn.type,
          txn.type === "SALE" ? -txn.quantity : txn.quantity,
          txn.unitCost || null,
          txn.type === "SALE" ? "invoice" : "purchase_order",
          txn.type === "SALE" ? uuidv4() : uuidv4(),
          txn.notes,
          txnTimestamp,
          txnTimestamp,
          deviceId
        );
      } else {
        insertTransaction.run(
          txnId,
          itemIds[txn.itemIndex].id,
          null,
          txn.warehouseId,
          txn.type,
          txn.type === "SALE" ? -txn.quantity : txn.quantity,
          txn.type === "SALE" ? "invoice" : "purchase_order",
          txn.type === "SALE" ? uuidv4() : uuidv4(),
          txn.notes,
          txnTimestamp,
          txnTimestamp,
          deviceId
        );
      }
    }
  }

  // Create some low stock alerts for testing
  const insertLowStockAlert = db.prepare(`
    INSERT INTO low_stock_alerts (
      id, item_id, variant_id, warehouse_id,
      current_quantity, threshold,
      is_resolved, created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'PENDING', ?)
  `);

  // Create alerts for items that are below threshold
  const lowStockItems = [
    { itemIndex: 0, warehouseId: warehouseId, currentQty: 8, threshold: 10 },
    { itemIndex: 1, warehouseId: warehouseId, currentQty: 3, threshold: 5 },
    { itemIndex: 2, warehouseId: warehouseId, currentQty: 4, threshold: 5 },
    { itemIndex: 4, warehouseId: warehouseId, currentQty: 2, threshold: 3 },
    { itemIndex: 5, warehouseId: warehouseId, currentQty: 1, threshold: 2 },
    { itemIndex: 7, warehouseId: warehouseId, currentQty: 4, threshold: 5 },
    { itemIndex: 8, warehouseId: warehouseId, currentQty: 1, threshold: 2 },
    { itemIndex: 9, warehouseId: warehouseId, currentQty: 2, threshold: 3 },
    { itemIndex: 0, warehouseId: warehouse2Id, currentQty: 5, threshold: 10 },
    { itemIndex: 1, warehouseId: warehouse2Id, currentQty: 2, threshold: 5 },
  ];

  for (const alert of lowStockItems) {
    insertLowStockAlert.run(
      uuidv4(),
      itemIds[alert.itemIndex].id,
      "",
      alert.warehouseId,
      alert.currentQty,
      alert.threshold,
      now,
      now,
      deviceId
    );
  }

  console.log("Inventory mock data seeded successfully");
}

/**
 * Create company_settings table
 */
function createCompanySettingsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      logo_url TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      tax_id TEXT,
      sales_tax_registration TEXT,
      signature_url TEXT,
      brand_color_primary TEXT,
      brand_color_secondary TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_company_settings_device_id ON company_settings(device_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_company_settings_sync_status ON company_settings(sync_status)"
  );
}

/**
 * Create invoice_templates table
 */
function createInvoiceTemplatesTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      template_type TEXT NOT NULL CHECK(template_type IN ('TAX_INVOICE', 'RECEIPT', 'ESTIMATE', 'CHALLAN')),
      template_data TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_invoice_templates_template_type ON invoice_templates(template_type)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_invoice_templates_is_default ON invoice_templates(is_default)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_invoice_templates_is_active ON invoice_templates(is_active)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_invoice_templates_sync_status ON invoice_templates(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_invoice_templates_device_id ON invoice_templates(device_id)"
  );
}

/**
 * Create invoices table
 */
function createInvoicesTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      invoice_type TEXT NOT NULL CHECK(invoice_type IN ('TAX_INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE')),
      customer_id TEXT NOT NULL,
      date TEXT NOT NULL,
      due_date TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      discount_percent REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED')),
      payment_terms TEXT,
      notes TEXT,
      reference_number TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)"
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_invoices_sync_status ON invoices(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_invoices_device_id ON invoices(device_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at)"
  );
}

/**
 * Create invoice_items table
 */
function createInvoiceItemsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      item_id TEXT,
      variant_id TEXT,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL DEFAULT 0,
      serial_number TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (variant_id) REFERENCES item_variants(id)
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_invoice_items_item_id ON invoice_items(item_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_invoice_items_sync_status ON invoice_items(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_invoice_items_device_id ON invoice_items(device_id)"
  );
}

/**
 * Create estimates table
 */
function createEstimatesTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS estimates (
      id TEXT PRIMARY KEY,
      estimate_number TEXT NOT NULL UNIQUE,
      customer_id TEXT NOT NULL,
      date TEXT NOT NULL,
      valid_until TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CONVERTED')),
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_estimates_estimate_number ON estimates(estimate_number)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_estimates_customer_id ON estimates(customer_id)"
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_estimates_date ON estimates(date)");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_estimates_sync_status ON estimates(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_estimates_device_id ON estimates(device_id)"
  );
}

/**
 * Create estimate_items table
 */
function createEstimateItemsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS estimate_items (
      id TEXT PRIMARY KEY,
      estimate_id TEXT NOT NULL,
      item_id TEXT,
      variant_id TEXT,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL,
      FOREIGN KEY (estimate_id) REFERENCES estimates(id),
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (variant_id) REFERENCES item_variants(id)
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id ON estimate_items(estimate_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_estimate_items_item_id ON estimate_items(item_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_estimate_items_sync_status ON estimate_items(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_estimate_items_device_id ON estimate_items(device_id)"
  );
}

/**
 * Create delivery_challans table
 */
function createDeliveryChallansTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS delivery_challans (
      id TEXT PRIMARY KEY,
      challan_number TEXT NOT NULL UNIQUE,
      customer_id TEXT NOT NULL,
      date TEXT NOT NULL,
      invoice_id TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'DELIVERED', 'CONVERTED')),
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_delivery_challans_challan_number ON delivery_challans(challan_number)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_delivery_challans_customer_id ON delivery_challans(customer_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_delivery_challans_date ON delivery_challans(date)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_delivery_challans_status ON delivery_challans(status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_delivery_challans_invoice_id ON delivery_challans(invoice_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_delivery_challans_sync_status ON delivery_challans(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_delivery_challans_device_id ON delivery_challans(device_id)"
  );
}

/**
 * Create challan_items table
 */
function createChallanItemsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS challan_items (
      id TEXT PRIMARY KEY,
      challan_id TEXT NOT NULL,
      item_id TEXT,
      variant_id TEXT,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL,
      FOREIGN KEY (challan_id) REFERENCES delivery_challans(id),
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (variant_id) REFERENCES item_variants(id)
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_challan_items_challan_id ON challan_items(challan_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_challan_items_item_id ON challan_items(item_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_challan_items_sync_status ON challan_items(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_challan_items_device_id ON challan_items(device_id)"
  );
}

/**
 * Create tax_rates table
 */
function createTaxRatesTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tax_rates (
      id TEXT PRIMARY KEY,
      tax_type TEXT NOT NULL CHECK(tax_type IN ('SALES_TAX', 'PST', 'WHT')),
      rate REAL NOT NULL,
      applicable_from TEXT NOT NULL,
      applicable_to TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_tax_rates_tax_type ON tax_rates(tax_type)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_tax_rates_is_active ON tax_rates(is_active)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_tax_rates_applicable_from ON tax_rates(applicable_from)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_tax_rates_sync_status ON tax_rates(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_tax_rates_device_id ON tax_rates(device_id)"
  );
}

/**
 * Create invoice_taxes table
 */
function createInvoiceTaxesTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_taxes (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      tax_type TEXT NOT NULL CHECK(tax_type IN ('SALES_TAX', 'PST', 'WHT')),
      tax_rate REAL NOT NULL,
      taxable_amount REAL NOT NULL,
      tax_amount REAL NOT NULL,
      tax_code TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_invoice_taxes_invoice_id ON invoice_taxes(invoice_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_invoice_taxes_tax_type ON invoice_taxes(tax_type)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_invoice_taxes_sync_status ON invoice_taxes(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_invoice_taxes_device_id ON invoice_taxes(device_id)"
  );
}

/**
 * Create tax_returns table
 */
function createTaxReturnsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tax_returns (
      id TEXT PRIMARY KEY,
      return_type TEXT NOT NULL CHECK(return_type IN ('STR-1', 'STR-2', 'STR-3', 'PST', 'WHT')),
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      filing_date TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'FILED')),
      return_data TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
      device_id TEXT NOT NULL
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_tax_returns_return_type ON tax_returns(return_type)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_tax_returns_period_start ON tax_returns(period_start)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_tax_returns_period_end ON tax_returns(period_end)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_tax_returns_status ON tax_returns(status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_tax_returns_sync_status ON tax_returns(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_tax_returns_device_id ON tax_returns(device_id)"
  );
}

/**
 * Seed invoice, estimate, challan, tax rates, and company settings data
 */
function seedInvoiceData(db) {
  const { v4: uuidv4 } = require("uuid");
  const deviceId = getDeviceId();
  const now = getCurrentTimestamp();
  const today = new Date();

  // Get existing customers and items
  const customers = db
    .prepare("SELECT id, name, address FROM customers LIMIT 8")
    .all();
  const items = db
    .prepare("SELECT id, name, selling_price, tax_rate FROM items LIMIT 10")
    .all();

  if (customers.length === 0 || items.length === 0) {
    console.log("Skipping invoice data seeding - customers or items not found");
    return;
  }

  // Seed Company Settings
  const companySettingsId = uuidv4();
  db.prepare(
    `
    INSERT OR IGNORE INTO company_settings (
      id, company_name, address, phone, email, website, tax_id, sales_tax_registration,
      created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `
  ).run(
    companySettingsId,
    "SaniTech Services",
    "123 Business Street, Karachi, Pakistan",
    "+92-300-1234567",
    "info@santech.local",
    "www.santech.local",
    "NTN-1234567-8",
    "STR-1234567-8",
    now,
    now,
    deviceId
  );

  // Seed Tax Rates
  const taxRates = [
    { taxType: "SALES_TAX", rate: 17, applicableFrom: "2024-01-01" },
    { taxType: "PST", rate: 13, applicableFrom: "2024-01-01" },
    { taxType: "WHT", rate: 3, applicableFrom: "2024-01-01" },
  ];

  const insertTaxRate = db.prepare(`
    INSERT INTO tax_rates (
      id, tax_type, rate, applicable_from, applicable_to, is_active,
      created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `);

  for (const rate of taxRates) {
    insertTaxRate.run(
      uuidv4(),
      rate.taxType,
      rate.rate,
      rate.applicableFrom,
      null,
      1,
      now,
      now,
      deviceId
    );
  }

  // Seed Invoice Templates
  const templates = [
    { name: "Standard Tax Invoice", templateType: "TAX_INVOICE", isDefault: 1 },
    { name: "Simple Receipt", templateType: "RECEIPT", isDefault: 0 },
    { name: "Professional Invoice", templateType: "TAX_INVOICE", isDefault: 0 },
  ];

  const insertTemplate = db.prepare(`
    INSERT INTO invoice_templates (
      id, name, template_type, template_data, is_default, is_active,
      created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `);

  for (const template of templates) {
    insertTemplate.run(
      uuidv4(),
      template.name,
      template.templateType,
      JSON.stringify({ layout: "standard" }),
      template.isDefault,
      1,
      now,
      now,
      deviceId
    );
  }

  // Seed Invoices
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (
      id, invoice_number, invoice_type, customer_id, date, due_date,
      subtotal, discount_amount, discount_percent, tax_amount, total_amount,
      status, payment_terms, notes, reference_number,
      created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `);

  const insertInvoiceItem = db.prepare(`
    INSERT INTO invoice_items (
      id, invoice_id, item_id, variant_id, description, quantity,
      unit_price, discount_amount, tax_rate, tax_amount, line_total,
      serial_number, created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `);

  const invoiceStatuses = ["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE"];
  const invoiceIds = [];

  // Create 15 invoices
  for (let i = 0; i < 15; i++) {
    const invoiceId = uuidv4();
    const invoiceDate = new Date(today);
    invoiceDate.setDate(invoiceDate.getDate() - Math.floor(Math.random() * 60));
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const customer = customers[Math.floor(Math.random() * customers.length)];
    const numItems = Math.floor(Math.random() * 4) + 1; // 1-4 items per invoice

    let subtotal = 0;
    const invoiceItems = [];

    // Generate invoice items
    for (let j = 0; j < numItems; j++) {
      const item = items[Math.floor(Math.random() * items.length)];
      const quantity = Math.floor(Math.random() * 5) + 1;
      const unitPrice = item.selling_price;
      const discountAmount =
        Math.random() > 0.7 ? unitPrice * quantity * 0.1 : 0;
      const lineSubtotal = unitPrice * quantity - discountAmount;
      const taxRate = item.tax_rate || 17;
      const taxAmount = (lineSubtotal * taxRate) / 100;
      const lineTotal = lineSubtotal + taxAmount;

      subtotal += lineSubtotal;

      invoiceItems.push({
        itemId: item.id,
        description: item.name,
        quantity,
        unitPrice,
        discountAmount,
        taxRate,
        taxAmount,
        lineTotal,
      });
    }

    const discountAmount = Math.random() > 0.8 ? subtotal * 0.05 : 0;
    const finalSubtotal = subtotal - discountAmount;
    const taxAmount = (finalSubtotal * 17) / 100;
    const totalAmount = finalSubtotal + taxAmount;

    const status =
      invoiceStatuses[Math.floor(Math.random() * invoiceStatuses.length)];
    const invoiceNumber = `INV-${invoiceDate
      .toISOString()
      .split("T")[0]
      .replace(/-/g, "")}-${String(i + 1).padStart(3, "0")}`;

    insertInvoice.run(
      invoiceId,
      invoiceNumber,
      "TAX_INVOICE",
      customer.id,
      invoiceDate.toISOString().split("T")[0],
      dueDate.toISOString().split("T")[0],
      finalSubtotal,
      discountAmount,
      discountAmount > 0 ? 5 : 0,
      taxAmount,
      totalAmount,
      status,
      "Net 30",
      `Invoice for ${customer.name}`,
      null,
      now,
      now,
      deviceId
    );

    invoiceIds.push(invoiceId);

    // Insert invoice items
    for (const item of invoiceItems) {
      insertInvoiceItem.run(
        uuidv4(),
        invoiceId,
        item.itemId,
        null,
        item.description,
        item.quantity,
        item.unitPrice,
        item.discountAmount,
        item.taxRate,
        item.taxAmount,
        item.lineTotal,
        null,
        now,
        now,
        deviceId
      );
    }
  }

  // Seed Estimates
  const insertEstimate = db.prepare(`
    INSERT INTO estimates (
      id, estimate_number, customer_id, date, valid_until,
      subtotal, discount_amount, tax_amount, total_amount,
      status, notes, created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `);

  const insertEstimateItem = db.prepare(`
    INSERT INTO estimate_items (
      id, estimate_id, item_id, variant_id, description, quantity,
      unit_price, discount_amount, tax_rate, tax_amount, line_total,
      created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `);

  const estimateStatuses = ["DRAFT", "SENT", "ACCEPTED", "REJECTED"];
  const estimateIds = [];

  // Create 8 estimates
  for (let i = 0; i < 8; i++) {
    const estimateId = uuidv4();
    const estimateDate = new Date(today);
    estimateDate.setDate(
      estimateDate.getDate() - Math.floor(Math.random() * 30)
    );
    const validUntil = new Date(estimateDate);
    validUntil.setDate(validUntil.getDate() + 15);

    const customer = customers[Math.floor(Math.random() * customers.length)];
    const numItems = Math.floor(Math.random() * 3) + 1;

    let subtotal = 0;
    const estimateItems = [];

    for (let j = 0; j < numItems; j++) {
      const item = items[Math.floor(Math.random() * items.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const unitPrice = item.selling_price;
      const discountAmount = 0;
      const lineSubtotal = unitPrice * quantity;
      const taxRate = item.tax_rate || 17;
      const taxAmount = (lineSubtotal * taxRate) / 100;
      const lineTotal = lineSubtotal + taxAmount;

      subtotal += lineSubtotal;

      estimateItems.push({
        itemId: item.id,
        description: item.name,
        quantity,
        unitPrice,
        discountAmount,
        taxRate,
        taxAmount,
        lineTotal,
      });
    }

    const taxAmount = (subtotal * 17) / 100;
    const totalAmount = subtotal + taxAmount;
    const status =
      estimateStatuses[Math.floor(Math.random() * estimateStatuses.length)];
    const estimateNumber = `EST-${estimateDate
      .toISOString()
      .split("T")[0]
      .replace(/-/g, "")}-${String(i + 1).padStart(3, "0")}`;

    insertEstimate.run(
      estimateId,
      estimateNumber,
      customer.id,
      estimateDate.toISOString().split("T")[0],
      validUntil.toISOString().split("T")[0],
      subtotal,
      0,
      taxAmount,
      totalAmount,
      status,
      `Estimate for ${customer.name}`,
      now,
      now,
      deviceId
    );

    estimateIds.push(estimateId);

    for (const item of estimateItems) {
      insertEstimateItem.run(
        uuidv4(),
        estimateId,
        item.itemId,
        null,
        item.description,
        item.quantity,
        item.unitPrice,
        item.discountAmount,
        item.taxRate,
        item.taxAmount,
        item.lineTotal,
        now,
        now,
        deviceId
      );
    }
  }

  // Seed Delivery Challans
  const insertChallan = db.prepare(`
    INSERT INTO delivery_challans (
      id, challan_number, customer_id, date, invoice_id,
      status, notes, created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `);

  const insertChallanItem = db.prepare(`
    INSERT INTO challan_items (
      id, challan_id, item_id, variant_id, description, quantity,
      unit_price, created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `);

  const challanStatuses = ["DRAFT", "DELIVERED", "CONVERTED"];
  const challanIds = [];

  // Create 6 challans
  for (let i = 0; i < 6; i++) {
    const challanId = uuidv4();
    const challanDate = new Date(today);
    challanDate.setDate(challanDate.getDate() - Math.floor(Math.random() * 20));

    const customer = customers[Math.floor(Math.random() * customers.length)];
    const numItems = Math.floor(Math.random() * 3) + 1;

    let subtotal = 0;
    const challanItems = [];

    for (let j = 0; j < numItems; j++) {
      const item = items[Math.floor(Math.random() * items.length)];
      const quantity = Math.floor(Math.random() * 5) + 1;
      const unitPrice = item.selling_price;
      const discountAmount = 0;
      const lineSubtotal = unitPrice * quantity;
      const taxRate = item.tax_rate || 17;
      const taxAmount = (lineSubtotal * taxRate) / 100;
      const lineTotal = lineSubtotal + taxAmount;

      subtotal += lineSubtotal;

      challanItems.push({
        itemId: item.id,
        description: item.name,
        quantity,
        unitPrice,
      });
    }

    const status =
      challanStatuses[Math.floor(Math.random() * challanStatuses.length)];
    const challanNumber = `CHL-${challanDate
      .toISOString()
      .split("T")[0]
      .replace(/-/g, "")}-${String(i + 1).padStart(3, "0")}`;

    insertChallan.run(
      challanId,
      challanNumber,
      customer.id,
      challanDate.toISOString().split("T")[0],
      null,
      status,
      `Delivery challan for ${customer.name}`,
      now,
      now,
      deviceId
    );

    challanIds.push(challanId);

    for (const item of challanItems) {
      insertChallanItem.run(
        uuidv4(),
        challanId,
        item.itemId,
        null,
        item.description,
        item.quantity,
        item.unitPrice,
        now,
        now,
        deviceId
      );
    }
  }

  console.log(
    "Invoice, estimate, challan, tax rates, and company settings data seeded successfully"
  );
}

/**
 * Update ledger_entries table schema to support invoices
 */
function updateLedgerEntriesSchema(db) {
  // Check if the schema already has INVOICE_CREATED
  const tableInfo = db.prepare("PRAGMA table_info(ledger_entries)").all();
  const hasInvoiceType = db
    .prepare(
      `
    SELECT sql FROM sqlite_master 
    WHERE type='table' AND name='ledger_entries'
  `
    )
    .get();

  if (
    hasInvoiceType &&
    hasInvoiceType.sql &&
    hasInvoiceType.sql.includes("INVOICE_CREATED")
  ) {
    console.log("Ledger entries schema already updated");
    return;
  }

  // SQLite doesn't support ALTER TABLE for CHECK constraints, so we need to recreate
  // Create backup table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ledger_entries_backup AS 
    SELECT * FROM ledger_entries
  `);

  // Drop old table
  db.exec("DROP TABLE IF EXISTS ledger_entries");

  // Recreate with updated schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id TEXT PRIMARY KEY,
      entry_type TEXT NOT NULL CHECK(entry_type IN (
        'JOB_CREATED',
        'INVOICE_CREATED',
        'PAYMENT_RECEIVED',
        'PAYMENT_MADE',
        'EXPENSE_RECORDED',
        'ADJUSTMENT',
        'OPENING_BALANCE'
      )),
      reference_type TEXT NOT NULL CHECK(reference_type IN ('job', 'invoice', 'estimate', 'challan', 'payment', 'expense', 'customer', 'system')),
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

  // Restore data
  db.exec(`
    INSERT INTO ledger_entries 
    SELECT * FROM ledger_entries_backup
  `);

  // Drop backup
  db.exec("DROP TABLE IF EXISTS ledger_entries_backup");

  // Recreate indexes
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_ledger_entries_entry_type ON ledger_entries(entry_type)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference ON ledger_entries(reference_type, reference_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_ledger_entries_customer_id ON ledger_entries(customer_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_ledger_entries_sync_status ON ledger_entries(sync_status)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_ledger_entries_device_id ON ledger_entries(device_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON ledger_entries(created_at)"
  );

  // Recreate triggers
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS prevent_ledger_update
    BEFORE UPDATE ON ledger_entries
    BEGIN
      SELECT RAISE(ABORT, 'Ledger entries cannot be modified. Use adjustment entries instead.');
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS prevent_ledger_delete
    BEFORE DELETE ON ledger_entries
    BEGIN
      SELECT RAISE(ABORT, 'Ledger entries cannot be deleted. Use adjustment entries instead.');
    END
  `);

  console.log("Ledger entries schema updated successfully");
}

/**
 * Add reorder_quantity field to stock_levels table
 */
function addReorderQuantityToStockLevels(db) {
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(stock_levels)").all();
  const hasReorderQuantity = tableInfo.some(col => col.name === 'reorder_quantity');
  
  if (!hasReorderQuantity) {
    db.exec(`
      ALTER TABLE stock_levels 
      ADD COLUMN reorder_quantity REAL NOT NULL DEFAULT 0
    `);
    console.log("Added reorder_quantity column to stock_levels table");
  } else {
    console.log("reorder_quantity column already exists in stock_levels table");
  }
}

/**
 * Add unit_cost to stock_transactions and valuation_method to items
 */
function addValuationFields(db) {
  // Add unit_cost to stock_transactions
  const txnTableInfo = db.prepare("PRAGMA table_info(stock_transactions)").all();
  const hasUnitCost = txnTableInfo.some(col => col.name === 'unit_cost');
  
  if (!hasUnitCost) {
    db.exec(`
      ALTER TABLE stock_transactions 
      ADD COLUMN unit_cost REAL
    `);
    console.log("Added unit_cost column to stock_transactions table");
  }
  
  // Add valuation_method to items
  const itemsTableInfo = db.prepare("PRAGMA table_info(items)").all();
  const hasValuationMethod = itemsTableInfo.some(col => col.name === 'valuation_method');
  
  if (!hasValuationMethod) {
    db.exec(`
      ALTER TABLE items 
      ADD COLUMN valuation_method TEXT DEFAULT 'FIFO' CHECK(valuation_method IN ('FIFO', 'LIFO', 'WEIGHTED_AVERAGE'))
    `);
    console.log("Added valuation_method column to items table");
  }
}

/**
 * Create inventory_valuations table
 */
function createInventoryValuationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_valuations (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      variant_id TEXT NOT NULL DEFAULT '',
      warehouse_id TEXT NOT NULL,
      valuation_method TEXT NOT NULL CHECK(valuation_method IN ('FIFO', 'LIFO', 'WEIGHTED_AVERAGE')),
      total_cost REAL NOT NULL DEFAULT 0,
      total_quantity REAL NOT NULL DEFAULT 0,
      average_cost REAL NOT NULL DEFAULT 0,
      calculated_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
      UNIQUE(item_id, variant_id, warehouse_id, valuation_method)
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_inventory_valuations_item_id ON inventory_valuations(item_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_inventory_valuations_warehouse_id ON inventory_valuations(warehouse_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_inventory_valuations_method ON inventory_valuations(valuation_method)"
  );
  
  console.log("Created inventory_valuations table");
}

module.exports = {
  runMigrations,
  seedInvoiceData,
};
