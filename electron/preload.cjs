const { contextBridge, ipcRenderer } = require('electron');

/**
 * Secure preload script
 * Exposes a minimal API to the renderer process via contextBridge
 * This is the ONLY bridge between the React UI and Electron main process
 */

contextBridge.exposeInMainWorld('electronAPI', {
  // Platform information
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0',

  // ==================== DATABASE ====================
  
  /** Initialize database */
  initDatabase: () => ipcRenderer.invoke('db:init'),
  
  /** Get database status */
  getDbStatus: () => ipcRenderer.invoke('db:status'),

  // ==================== CUSTOMERS ====================
  
  /** Create a new customer */
  createCustomer: (data) => ipcRenderer.invoke('customers:create', data),
  
  /** Update an existing customer */
  updateCustomer: (id, data) => ipcRenderer.invoke('customers:update', { id, data }),
  
  /** Get all customers */
  getCustomers: (filters) => ipcRenderer.invoke('customers:get-all', filters),
  
  /** Get customer by ID */
  getCustomerById: (id) => ipcRenderer.invoke('customers:get-by-id', id),
  
  /** Get customer with ledger entries */
  getCustomerLedger: (id) => ipcRenderer.invoke('customers:get-ledger', id),

  // ==================== JOBS ====================
  
  /** Create a new job */
  createJob: (data) => ipcRenderer.invoke('jobs:create', data),
  
  /** Update an existing job */
  updateJob: (id, data) => ipcRenderer.invoke('jobs:update', { id, data }),
  
  /** Get all jobs */
  getJobs: (filters) => ipcRenderer.invoke('jobs:get-all', filters),
  
  /** Get job by ID */
  getJobById: (id) => ipcRenderer.invoke('jobs:get-by-id', id),

  // ==================== PAYMENTS ====================
  
  /** Create a new payment */
  createPayment: (data) => ipcRenderer.invoke('payments:create', data),
  
  /** Get all payments */
  getPayments: (filters) => ipcRenderer.invoke('payments:get-all', filters),
  
  /** Get payments by job ID */
  getPaymentsByJob: (jobId) => ipcRenderer.invoke('payments:get-by-job', jobId),

  // ==================== EXPENSES ====================
  
  /** Create a new expense */
  createExpense: (data) => ipcRenderer.invoke('expenses:create', data),
  
  /** Update an existing expense */
  updateExpense: (id, data) => ipcRenderer.invoke('expenses:update', { id, data }),
  
  /** Get all expenses */
  getExpenses: (filters) => ipcRenderer.invoke('expenses:get-all', filters),

  // ==================== LEDGERS ====================
  
  /** Get cash ledger entries */
  getCashLedger: (filters) => ipcRenderer.invoke('ledgers:get-cash', filters),
  
  /** Get customer ledger entries */
  getCustomerLedgerEntries: (customerId, filters) => 
    ipcRenderer.invoke('ledgers:get-customer', { customerId, filters }),
  
  /** Get all ledger entries */
  getAllLedgerEntries: (filters) => ipcRenderer.invoke('ledgers:get-all', filters),

  // ==================== REPORTS ====================
  
  /** Get daily report */
  getDailyReport: (date) => ipcRenderer.invoke('reports:daily', date),
  
  /** Get monthly report */
  getMonthlyReport: (year, month) => ipcRenderer.invoke('reports:monthly', { year, month }),
  
  /** Get cash flow report */
  getCashFlowReport: (startDate, endDate) => 
    ipcRenderer.invoke('reports:cash-flow', { startDate, endDate }),

  // ==================== SERVICE TYPES ====================
  
  /** Get all service types */
  getServiceTypes: (filters) => ipcRenderer.invoke('service-types:get-all', filters),
  
  /** Create a new service type */
  createServiceType: (data) => ipcRenderer.invoke('service-types:create', data),

  // ==================== USERS ====================
  
  /** Get all users */
  getUsers: (filters) => ipcRenderer.invoke('users:get-all', filters),
  
  /** Create a new user */
  createUser: (data) => ipcRenderer.invoke('users:create', data),

  // ==================== LEGACY (for compatibility) ====================
  
  /** Synchronize data (placeholder for future sync) */
  syncNow: async () => {
    try {
      const result = await ipcRenderer.invoke('sync-now');
      return result;
    } catch (error) {
      console.error('Sync error:', error);
      return { success: false, error: error.message };
    }
  },

  /** Get application status */
  getAppStatus: async () => {
    try {
      const result = await ipcRenderer.invoke('get-app-status');
      return result;
    } catch (error) {
      console.error('Status error:', error);
      return { status: 'error', error: error.message };
    }
  },
});

// Log that preload script has loaded (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('Electron preload script loaded with full API');
}
