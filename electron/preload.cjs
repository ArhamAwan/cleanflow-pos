const { contextBridge, ipcRenderer } = require("electron");

/**
 * Secure preload script
 * Exposes a minimal API to the renderer process via contextBridge
 * This is the ONLY bridge between the React UI and Electron main process
 */


// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
  contextBridge.exposeInMainWorld("electronAPI", {
    /**
     * Database operations
     */
    db: {
      init: async () => {
        try {
          return await ipcRenderer.invoke("db:init");
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      status: async () => {
        try {
          return await ipcRenderer.invoke("db:status");
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
          return await ipcRenderer.invoke("customers:create", data);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      update: async (id, data) => {
        try {
          return await ipcRenderer.invoke("customers:update", { id, data });
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getAll: async (filters = {}) => {
        try {
          return await ipcRenderer.invoke("customers:get-all", filters);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getById: async (id) => {
        try {
          return await ipcRenderer.invoke("customers:get-by-id", id);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getLedger: async (id) => {
        try {
          return await ipcRenderer.invoke("customers:get-ledger", id);
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
          return await ipcRenderer.invoke("jobs:create", data);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      update: async (id, data) => {
        try {
          return await ipcRenderer.invoke("jobs:update", { id, data });
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getAll: async (filters = {}) => {
        try {
          return await ipcRenderer.invoke("jobs:get-all", filters);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getById: async (id) => {
        try {
          return await ipcRenderer.invoke("jobs:get-by-id", id);
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
          return await ipcRenderer.invoke("payments:create", data);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getAll: async (filters = {}) => {
        try {
          return await ipcRenderer.invoke("payments:get-all", filters);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getByJob: async (jobId) => {
        try {
          return await ipcRenderer.invoke("payments:get-by-job", jobId);
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
          return await ipcRenderer.invoke("expenses:create", data);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      update: async (id, data) => {
        try {
          return await ipcRenderer.invoke("expenses:update", { id, data });
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getAll: async (filters = {}) => {
        try {
          return await ipcRenderer.invoke("expenses:get-all", filters);
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
          return await ipcRenderer.invoke("ledgers:get-cash", filters);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getCustomer: async (customerId, filters = {}) => {
        try {
          return await ipcRenderer.invoke("ledgers:get-customer", {
            customerId,
            filters,
          });
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getAll: async (filters = {}) => {
        try {
          return await ipcRenderer.invoke("ledgers:get-all", filters);
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
          return await ipcRenderer.invoke("reports:daily", date);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getMonthly: async (year, month) => {
        try {
          return await ipcRenderer.invoke("reports:monthly", { year, month });
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getCashFlow: async (startDate, endDate) => {
        try {
          return await ipcRenderer.invoke("reports:cash-flow", {
            startDate,
            endDate,
          });
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
          return await ipcRenderer.invoke("service-types:get-all", filters);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      create: async (data) => {
        try {
          return await ipcRenderer.invoke("service-types:create", data);
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
          return await ipcRenderer.invoke("users:get-all", filters);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      create: async (data) => {
        try {
          return await ipcRenderer.invoke("users:create", data);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
    },

    /**
     * Inventory operations
     */
    inventory: {
      items: {
        create: async (data) => {
          try {
            return await ipcRenderer.invoke("inventory:items:create", data);
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        update: async (id, data) => {
          try {
            return await ipcRenderer.invoke("inventory:items:update", {
              id,
              data,
            });
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        getAll: async (filters = {}) => {
          try {
            return await ipcRenderer.invoke("inventory:items:get-all", filters);
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        getById: async (id) => {
          try {
            return await ipcRenderer.invoke("inventory:items:get-by-id", id);
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        getByBarcode: async (barcode) => {
          try {
            return await ipcRenderer.invoke(
              "inventory:items:get-by-barcode",
              barcode
            );
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        updateValuationMethod: async (params) => {
          try {
            return await ipcRenderer.invoke(
              "inventory:items:update-valuation-method",
              params
            );
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
      },
      stock: {
        add: async (params) => {
          try {
            return await ipcRenderer.invoke("inventory:stock:add", params);
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        remove: async (params) => {
          try {
            return await ipcRenderer.invoke("inventory:stock:remove", params);
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        transfer: async (params) => {
          try {
            return await ipcRenderer.invoke("inventory:stock:transfer", params);
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        getLevels: async (params) => {
          try {
            return await ipcRenderer.invoke(
              "inventory:stock:get-levels",
              params
            );
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        checkAvailability: async (params) => {
          try {
            return await ipcRenderer.invoke(
              "inventory:stock:check-availability",
              params
            );
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        getLowStock: async (warehouseId = null) => {
          try {
            return await ipcRenderer.invoke(
              "inventory:stock:get-low-stock",
              warehouseId
            );
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        updateThreshold: async (params) => {
          try {
            return await ipcRenderer.invoke(
              "inventory:stock:update-threshold",
              params
            );
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        updateReorderPoint: async (params) => {
          try {
            return await ipcRenderer.invoke(
              "inventory:stock:update-reorder-point",
              params
            );
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        getItemsNeedingReorder: async (warehouseId = null) => {
          try {
            return await ipcRenderer.invoke(
              "inventory:stock:get-items-needing-reorder",
              warehouseId
            );
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        getReorderSuggestions: async (warehouseId = null) => {
          try {
            return await ipcRenderer.invoke(
              "inventory:stock:get-reorder-suggestions",
              warehouseId
            );
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
      },
      valuation: {
        calculate: async (params) => {
          try {
            return await ipcRenderer.invoke(
              "inventory:valuation:calculate",
              params
            );
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        calculateCOGS: async (params) => {
          try {
            return await ipcRenderer.invoke(
              "inventory:valuation:calculate-cogs",
              params
            );
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
      },
      transactions: {
        getAll: async (filters = {}) => {
          try {
            return await ipcRenderer.invoke(
              "inventory:transactions:get-all",
              filters
            );
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
      },
    },

    /**
     * Warehouse operations
     */
    warehouses: {
      create: async (data) => {
        try {
          return await ipcRenderer.invoke("warehouses:create", data);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      update: async (id, data) => {
        try {
          return await ipcRenderer.invoke("warehouses:update", { id, data });
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getAll: async (filters = {}) => {
        try {
          return await ipcRenderer.invoke("warehouses:get-all", filters);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getById: async (id) => {
        try {
          return await ipcRenderer.invoke("warehouses:get-by-id", id);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getDefault: async () => {
        try {
          return await ipcRenderer.invoke("warehouses:get-default");
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
    },

    /**
     * Invoice operations
     */
    invoices: {
      create: async (data) => {
        try {
          return await ipcRenderer.invoke("invoices:create", data);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getById: async (id) => {
        try {
          return await ipcRenderer.invoke("invoices:get-by-id", id);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getAll: async (filters = {}) => {
        try {
          return await ipcRenderer.invoke("invoices:get-all", filters);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      updateStatus: async (invoiceId, status) => {
        try {
          return await ipcRenderer.invoke("invoices:update-status", {
            invoiceId,
            status,
          });
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      generateNumber: async () => {
        try {
          return await ipcRenderer.invoke("invoices:generate-number");
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
    },

    /**
     * Estimate operations
     */
    estimates: {
      create: async (data) => {
        try {
          return await ipcRenderer.invoke("estimates:create", data);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getById: async (id) => {
        try {
          return await ipcRenderer.invoke("estimates:get-by-id", id);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getAll: async (filters = {}) => {
        try {
          return await ipcRenderer.invoke("estimates:get-all", filters);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      convertToInvoice: async (estimateId) => {
        try {
          return await ipcRenderer.invoke(
            "estimates:convert-to-invoice",
            estimateId
          );
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
    },

    /**
     * Challan operations
     */
    challans: {
      create: async (data) => {
        try {
          return await ipcRenderer.invoke("challans:create", data);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getById: async (id) => {
        try {
          return await ipcRenderer.invoke("challans:get-by-id", id);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getAll: async (filters = {}) => {
        try {
          return await ipcRenderer.invoke("challans:get-all", filters);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      convertToInvoice: async (challanId) => {
        try {
          return await ipcRenderer.invoke(
            "challans:convert-to-invoice",
            challanId
          );
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
    },

    /**
     * Company settings operations
     */
    companySettings: {
      get: async () => {
        try {
          return await ipcRenderer.invoke("company-settings:get");
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      update: async (data) => {
        try {
          return await ipcRenderer.invoke("company-settings:update", data);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
    },

    /**
     * Tax operations
     */
    tax: {
      getRates: async (filters = {}) => {
        try {
          return await ipcRenderer.invoke("tax:get-rates", filters);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      saveRate: async (data) => {
        try {
          return await ipcRenderer.invoke("tax:save-rate", data);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      calculateInvoiceTaxes: async (invoiceItems, customerId, province) => {
        try {
          return await ipcRenderer.invoke("tax:calculate-invoice-taxes", {
            invoiceItems,
            customerId,
            province,
          });
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getInvoiceTaxes: async (invoiceId) => {
        try {
          return await ipcRenderer.invoke("tax:get-invoice-taxes", invoiceId);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
    },

    /**
     * Tax Reports operations
     */
    taxReports: {
      generateSTR1: async (startDate, endDate) => {
        try {
          return await ipcRenderer.invoke("tax-reports:generate-str1", {
            startDate,
            endDate,
          });
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      generateSTR2: async (startDate, endDate) => {
        try {
          return await ipcRenderer.invoke("tax-reports:generate-str2", {
            startDate,
            endDate,
          });
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      generateSTR3: async (startDate, endDate) => {
        try {
          return await ipcRenderer.invoke("tax-reports:generate-str3", {
            startDate,
            endDate,
          });
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      generatePST: async (province, startDate, endDate) => {
        try {
          return await ipcRenderer.invoke("tax-reports:generate-pst", {
            province,
            startDate,
            endDate,
          });
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      generateWHT: async (startDate, endDate) => {
        try {
          return await ipcRenderer.invoke("tax-reports:generate-wht", {
            startDate,
            endDate,
          });
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getSummary: async (startDate, endDate) => {
        try {
          return await ipcRenderer.invoke("tax-reports:get-summary", {
            startDate,
            endDate,
          });
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      saveReturn: async (data) => {
        try {
          return await ipcRenderer.invoke("tax-reports:save-return", data);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getReturns: async (filters = {}) => {
        try {
          return await ipcRenderer.invoke("tax-reports:get-returns", filters);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getReturn: async (returnId) => {
        try {
          return await ipcRenderer.invoke("tax-reports:get-return", returnId);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
    },

    /**
     * Receivables & Payables operations
     */
    receivables: {
      getAll: async (filters = {}) => {
        try {
          return await ipcRenderer.invoke("receivables:get-all", filters);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getSummary: async () => {
        try {
          return await ipcRenderer.invoke("receivables:get-summary");
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getByCustomer: async () => {
        try {
          return await ipcRenderer.invoke("receivables:get-by-customer");
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getOverdue: async (daysThreshold = 0) => {
        try {
          return await ipcRenderer.invoke(
            "receivables:get-overdue",
            daysThreshold
          );
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
    },

    payables: {
      getAll: async (filters = {}) => {
        try {
          return await ipcRenderer.invoke("payables:get-all", filters);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getSummary: async () => {
        try {
          return await ipcRenderer.invoke("payables:get-summary");
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
        const result = await ipcRenderer.invoke("db:status");
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    getAppStatus: async () => {
      try {
        const result = await ipcRenderer.invoke("db:status");
        return result;
      } catch (error) {
        return { status: "error", error: error.message };
      }
    },

    /**
     * Test/Sync utility operations
     */
    test: {
      getDeviceId: async () => {
        try {
          return await ipcRenderer.invoke("test:get-device-id");
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getSyncStats: async () => {
        try {
          return await ipcRenderer.invoke("test:get-sync-stats");
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getPendingRecords: async (tableName, limit = 100) => {
        try {
          return await ipcRenderer.invoke("test:get-pending-records", {
            tableName,
            limit,
          });
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getAllPending: async (limit = 100) => {
        try {
          return await ipcRenderer.invoke("test:get-all-pending", limit);
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
          return await ipcRenderer.invoke("sync:full");
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      upload: async () => {
        try {
          return await ipcRenderer.invoke("sync:upload");
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      download: async () => {
        try {
          return await ipcRenderer.invoke("sync:download");
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getStatus: async () => {
        try {
          return await ipcRenderer.invoke("sync:status");
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      checkServer: async () => {
        try {
          return await ipcRenderer.invoke("sync:check-server");
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      setServerUrl: async (url) => {
        try {
          return await ipcRenderer.invoke("sync:set-server-url", url);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getServerUrl: async () => {
        try {
          return await ipcRenderer.invoke("sync:get-server-url");
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getQueueStatus: async () => {
        try {
          return await ipcRenderer.invoke("sync:queue-status");
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      getQueuePending: async (tableName, limit) => {
        try {
          return await ipcRenderer.invoke("sync:queue-pending", {
            tableName,
            limit,
          });
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      resetFailedQueue: async (tableName) => {
        try {
          return await ipcRenderer.invoke("sync:queue-reset-failed", tableName);
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      cleanupQueue: async (daysOld) => {
        try {
          return await ipcRenderer.invoke("sync:queue-cleanup", daysOld);
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
    version: process.env.npm_package_version || "1.0.0",

    /**
     * Shell operations - open external URLs
     */
    openExternal: async (url) => {
      try {
        const result = await ipcRenderer.invoke("shell:open-external", url);
        return result;
      } catch (error) {
        console.error("openExternal error:", error);
        return { success: false, error: error.message };
      }
    },
  });

} catch (error) {
  console.error("Error exposing electronAPI:", error);
}
