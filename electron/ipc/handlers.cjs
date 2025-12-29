const { ipcMain } = require('electron');
const { runMigrations } = require('../db/migrations.cjs');
const { getDatabase, getDeviceId, closeDatabase } = require('../db/database.cjs');

// Services
const customerService = require('../services/customers.cjs');
const jobService = require('../services/jobs.cjs');
const paymentService = require('../services/payments.cjs');
const expenseService = require('../services/expenses.cjs');
const ledgerService = require('../services/ledgers.cjs');
const reportService = require('../services/reports.cjs');
const serviceTypeService = require('../services/serviceTypes.cjs');
const userService = require('../services/users.cjs');
const auditService = require('../services/audit.cjs');

/**
 * Register all IPC handlers
 */
function registerHandlers() {
  // Database initialization
  ipcMain.handle('db:init', async () => {
    try {
      getDatabase();
      runMigrations();
      return { success: true, data: { deviceId: getDeviceId() } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:status', async () => {
    try {
      return { success: true, data: { deviceId: getDeviceId(), status: 'connected' } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Test/Sync utility handlers
  ipcMain.handle('test:get-device-id', async () => {
    try {
      const deviceId = getDeviceId();
      return { success: true, data: { deviceId } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('test:get-sync-stats', async () => {
    try {
      const syncUtils = require('../db/sync-utils.cjs');
      const stats = syncUtils.getSyncStatistics();
      const totalPending = syncUtils.getTotalPendingCount();
      return { success: true, data: { stats, totalPending } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('test:get-pending-records', async (_, { tableName, limit = 100 }) => {
    try {
      const syncUtils = require('../db/sync-utils.cjs');
      const records = syncUtils.getPendingRecords(tableName, limit);
      const count = syncUtils.getPendingCount(tableName);
      return { success: true, data: { records, count } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('test:get-all-pending', async (_, limit = 100) => {
    try {
      const syncUtils = require('../db/sync-utils.cjs');
      const allPending = syncUtils.getAllPendingRecords(limit);
      const totalPending = syncUtils.getTotalPendingCount();
      return { success: true, data: { allPending, totalPending } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Customer handlers
  ipcMain.handle('customers:create', async (_, data) => {
    try {
      const result = customerService.createCustomer(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('customers:update', async (_, { id, data }) => {
    try {
      const result = customerService.updateCustomer(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('customers:get-all', async (_, filters = {}) => {
    try {
      const result = customerService.getCustomers(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('customers:get-by-id', async (_, id) => {
    try {
      const result = customerService.getCustomerById(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('customers:get-ledger', async (_, id) => {
    try {
      const result = customerService.getCustomerWithLedger(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Job handlers
  ipcMain.handle('jobs:create', async (_, data) => {
    try {
      const result = jobService.createJob(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('jobs:update', async (_, { id, data }) => {
    try {
      const result = jobService.updateJob(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('jobs:get-all', async (_, filters = {}) => {
    try {
      const result = jobService.getJobs(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('jobs:get-by-id', async (_, id) => {
    try {
      const result = jobService.getJobById(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Payment handlers
  ipcMain.handle('payments:create', async (_, data) => {
    try {
      const result = paymentService.createPayment(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('payments:get-all', async (_, filters = {}) => {
    try {
      const result = paymentService.getPayments(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('payments:get-by-job', async (_, jobId) => {
    try {
      const result = paymentService.getPaymentsByJob(jobId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Expense handlers
  ipcMain.handle('expenses:create', async (_, data) => {
    try {
      const result = expenseService.createExpense(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('expenses:update', async (_, { id, data }) => {
    try {
      const result = expenseService.updateExpense(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('expenses:get-all', async (_, filters = {}) => {
    try {
      const result = expenseService.getExpenses(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Ledger handlers
  ipcMain.handle('ledgers:get-cash', async (_, filters = {}) => {
    try {
      const result = ledgerService.getCashLedger(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ledgers:get-customer', async (_, { customerId, filters = {} }) => {
    try {
      const result = ledgerService.getCustomerLedger(customerId, filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ledgers:get-all', async (_, filters = {}) => {
    try {
      const result = ledgerService.getAllLedgerEntries(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Report handlers
  ipcMain.handle('reports:daily', async (_, date) => {
    try {
      const result = reportService.getDailyReport(date);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:monthly', async (_, { year, month }) => {
    try {
      const result = reportService.getMonthlyReport(year, month);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:cash-flow', async (_, { startDate, endDate }) => {
    try {
      const result = reportService.getCashFlowReport(startDate, endDate);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Service type handlers
  ipcMain.handle('service-types:get-all', async (_, filters = {}) => {
    try {
      const result = serviceTypeService.getServiceTypes(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('service-types:create', async (_, data) => {
    try {
      const result = serviceTypeService.createServiceType(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // User handlers
  ipcMain.handle('users:get-all', async (_, filters = {}) => {
    try {
      const result = userService.getUsers(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('users:create', async (_, data) => {
    try {
      const result = userService.createUser(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  console.log('IPC handlers registered');
}

/**
 * Initialize database and handlers
 */
function initializeBackend() {
  try {
    getDatabase();
    runMigrations();
    registerHandlers();
    console.log('Backend initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize backend:', error);
    return false;
  }
}

/**
 * Cleanup on app quit
 */
function cleanupBackend() {
  closeDatabase();
}

module.exports = {
  registerHandlers,
  initializeBackend,
  cleanupBackend,
};
