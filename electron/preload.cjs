const { contextBridge, ipcRenderer } = require('electron');

/**
 * Secure preload script
 * Exposes a minimal API to the renderer process via contextBridge
 * This is the ONLY bridge between the React UI and Electron main process
 */

// Log that preload script has loaded
console.log('✅ Preload script executing...');
console.log('✅ contextBridge available:', typeof contextBridge !== 'undefined');
console.log('✅ ipcRenderer available:', typeof ipcRenderer !== 'undefined');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
  contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Database operations
   */
  db: {
    init: async () => {
      try {
        return await ipcRenderer.invoke('db:init');
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    status: async () => {
      try {
        return await ipcRenderer.invoke('db:status');
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },

  /**
   * Customer operations
   */
  customers: {
    create: async (data) => {
      try {
        return await ipcRenderer.invoke('customers:create', data);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    update: async (id, data) => {
      try {
        return await ipcRenderer.invoke('customers:update', { id, data });
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getAll: async (filters = {}) => {
      try {
        return await ipcRenderer.invoke('customers:get-all', filters);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getById: async (id) => {
      try {
        return await ipcRenderer.invoke('customers:get-by-id', id);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getLedger: async (id) => {
      try {
        return await ipcRenderer.invoke('customers:get-ledger', id);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },

  /**
   * Job operations
   */
  jobs: {
    create: async (data) => {
      try {
        return await ipcRenderer.invoke('jobs:create', data);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    update: async (id, data) => {
      try {
        return await ipcRenderer.invoke('jobs:update', { id, data });
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getAll: async (filters = {}) => {
      try {
        return await ipcRenderer.invoke('jobs:get-all', filters);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getById: async (id) => {
      try {
        return await ipcRenderer.invoke('jobs:get-by-id', id);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },

  /**
   * Payment operations
   */
  payments: {
    create: async (data) => {
      try {
        return await ipcRenderer.invoke('payments:create', data);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getAll: async (filters = {}) => {
      try {
        return await ipcRenderer.invoke('payments:get-all', filters);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getByJob: async (jobId) => {
      try {
        return await ipcRenderer.invoke('payments:get-by-job', jobId);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },

  /**
   * Expense operations
   */
  expenses: {
    create: async (data) => {
      try {
        return await ipcRenderer.invoke('expenses:create', data);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    update: async (id, data) => {
      try {
        return await ipcRenderer.invoke('expenses:update', { id, data });
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getAll: async (filters = {}) => {
      try {
        return await ipcRenderer.invoke('expenses:get-all', filters);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },

  /**
   * Ledger operations
   */
  ledgers: {
    getCash: async (filters = {}) => {
      try {
        return await ipcRenderer.invoke('ledgers:get-cash', filters);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getCustomer: async (customerId, filters = {}) => {
      try {
        return await ipcRenderer.invoke('ledgers:get-customer', { customerId, filters });
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getAll: async (filters = {}) => {
      try {
        return await ipcRenderer.invoke('ledgers:get-all', filters);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },

  /**
   * Report operations
   */
  reports: {
    getDaily: async (date) => {
      try {
        return await ipcRenderer.invoke('reports:daily', date);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getMonthly: async (year, month) => {
      try {
        return await ipcRenderer.invoke('reports:monthly', { year, month });
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getCashFlow: async (startDate, endDate) => {
      try {
        return await ipcRenderer.invoke('reports:cash-flow', { startDate, endDate });
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },

  /**
   * Service type operations
   */
  serviceTypes: {
    getAll: async (filters = {}) => {
      try {
        return await ipcRenderer.invoke('service-types:get-all', filters);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    create: async (data) => {
      try {
        return await ipcRenderer.invoke('service-types:create', data);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },

  /**
   * User operations
   */
  users: {
    getAll: async (filters = {}) => {
      try {
        return await ipcRenderer.invoke('users:get-all', filters);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    create: async (data) => {
      try {
        return await ipcRenderer.invoke('users:create', data);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },

  /**
   * Legacy methods (kept for backward compatibility)
   */
  syncNow: async () => {
    try {
      const result = await ipcRenderer.invoke('db:status');
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getAppStatus: async () => {
    try {
      const result = await ipcRenderer.invoke('db:status');
      return result;
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  },

  /**
   * Test/Sync utility operations
   */
  test: {
    getDeviceId: async () => {
      try {
        return await ipcRenderer.invoke('test:get-device-id');
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getSyncStats: async () => {
      try {
        return await ipcRenderer.invoke('test:get-sync-stats');
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getPendingRecords: async (tableName, limit = 100) => {
      try {
        return await ipcRenderer.invoke('test:get-pending-records', { tableName, limit });
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getAllPending: async (limit = 100) => {
      try {
        return await ipcRenderer.invoke('test:get-all-pending', limit);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },

  /**
   * Sync operations
   */
  sync: {
    fullSync: async () => {
      try {
        return await ipcRenderer.invoke('sync:full');
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    upload: async () => {
      try {
        return await ipcRenderer.invoke('sync:upload');
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    download: async () => {
      try {
        return await ipcRenderer.invoke('sync:download');
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getStatus: async () => {
      try {
        return await ipcRenderer.invoke('sync:status');
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    checkServer: async () => {
      try {
        return await ipcRenderer.invoke('sync:check-server');
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    setServerUrl: async (url) => {
      try {
        return await ipcRenderer.invoke('sync:set-server-url', url);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getServerUrl: async () => {
      try {
        return await ipcRenderer.invoke('sync:get-server-url');
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getQueueStatus: async () => {
      try {
        return await ipcRenderer.invoke('sync:queue-status');
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    getQueuePending: async (tableName, limit) => {
      try {
        return await ipcRenderer.invoke('sync:queue-pending', { tableName, limit });
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    resetFailedQueue: async (tableName) => {
      try {
        return await ipcRenderer.invoke('sync:queue-reset-failed', tableName);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    cleanupQueue: async (daysOld) => {
      try {
        return await ipcRenderer.invoke('sync:queue-cleanup', daysOld);
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },

  /**
   * Platform information (useful for UI adjustments)
   */
  platform: process.platform,
  
  /**
   * App version (from package.json)
   */
  version: process.env.npm_package_version || '1.0.0',
  });
  
  console.log('✅ electronAPI exposed via contextBridge');
  console.log('✅ Electron preload script loaded successfully');
} catch (error) {
  console.error('❌ Error exposing electronAPI:', error);
  console.error('❌ Error details:', error.stack);
}
