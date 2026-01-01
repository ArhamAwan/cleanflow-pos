const { ipcMain, shell } = require("electron");
const { runMigrations } = require("../db/migrations.cjs");
const {
  getDatabase,
  getDeviceId,
  closeDatabase,
} = require("../db/database.cjs");

// Services
const customerService = require("../services/customers.cjs");
const jobService = require("../services/jobs.cjs");
const paymentService = require("../services/payments.cjs");
const expenseService = require("../services/expenses.cjs");
const ledgerService = require("../services/ledgers.cjs");
const reportService = require("../services/reports.cjs");
const serviceTypeService = require("../services/serviceTypes.cjs");
const userService = require("../services/users.cjs");
const auditService = require("../services/audit.cjs");
const syncService = require("../services/sync.cjs");
const syncQueue = require("../services/syncQueue.cjs");
const dependencyResolver = require("../services/dependencyResolver.cjs");
const inventoryService = require("../services/inventory.cjs");
const warehouseService = require("../services/warehouses.cjs");
const invoiceService = require("../services/invoices.cjs");
const taxService = require("../services/tax.cjs");
const taxReportsService = require("../services/taxReports.cjs");
const receivablesPayablesService = require("../services/receivablesPayables.cjs");

/**
 * Register all IPC handlers
 */
function registerHandlers() {
  // Database initialization
  ipcMain.handle("db:init", async () => {
    try {
      getDatabase();
      runMigrations();
      return { success: true, data: { deviceId: getDeviceId() } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db:status", async () => {
    try {
      return {
        success: true,
        data: { deviceId: getDeviceId(), status: "connected" },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Test/Sync utility handlers
  ipcMain.handle("test:get-device-id", async () => {
    try {
      const deviceId = getDeviceId();
      return { success: true, data: { deviceId } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("test:get-sync-stats", async () => {
    try {
      const syncUtils = require("../db/sync-utils.cjs");
      const stats = syncUtils.getSyncStatistics();
      const totalPending = syncUtils.getTotalPendingCount();
      return { success: true, data: { stats, totalPending } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "test:get-pending-records",
    async (_, { tableName, limit = 100 }) => {
      try {
        const syncUtils = require("../db/sync-utils.cjs");
        const records = syncUtils.getPendingRecords(tableName, limit);
        const count = syncUtils.getPendingCount(tableName);
        return { success: true, data: { records, count } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle("test:get-all-pending", async (_, limit = 100) => {
    try {
      const syncUtils = require("../db/sync-utils.cjs");
      const allPending = syncUtils.getAllPendingRecords(limit);
      const totalPending = syncUtils.getTotalPendingCount();
      return { success: true, data: { allPending, totalPending } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Customer handlers
  ipcMain.handle("customers:create", async (_, data) => {
    try {
      const result = customerService.createCustomer(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("customers:update", async (_, { id, data }) => {
    try {
      const result = customerService.updateCustomer(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("customers:get-all", async (_, filters = {}) => {
    try {
      const result = customerService.getCustomers(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("customers:get-by-id", async (_, id) => {
    try {
      const result = customerService.getCustomerById(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("customers:get-ledger", async (_, id) => {
    try {
      const result = customerService.getCustomerWithLedger(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Job handlers
  ipcMain.handle("jobs:create", async (_, data) => {
    try {
      const result = jobService.createJob(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("jobs:update", async (_, { id, data }) => {
    try {
      const result = jobService.updateJob(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("jobs:get-all", async (_, filters = {}) => {
    try {
      const result = jobService.getJobs(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("jobs:get-by-id", async (_, id) => {
    try {
      const result = jobService.getJobById(id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Payment handlers
  ipcMain.handle("payments:create", async (_, data) => {
    try {
      const result = paymentService.createPayment(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("payments:get-all", async (_, filters = {}) => {
    try {
      const result = paymentService.getPayments(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("payments:get-by-job", async (_, jobId) => {
    try {
      const result = paymentService.getPaymentsByJob(jobId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Expense handlers
  ipcMain.handle("expenses:create", async (_, data) => {
    try {
      const result = expenseService.createExpense(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("expenses:update", async (_, { id, data }) => {
    try {
      const result = expenseService.updateExpense(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("expenses:get-all", async (_, filters = {}) => {
    try {
      const result = expenseService.getExpenses(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Ledger handlers
  ipcMain.handle("ledgers:get-cash", async (_, filters = {}) => {
    try {
      const result = ledgerService.getCashLedger(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "ledgers:get-customer",
    async (_, { customerId, filters = {} }) => {
      try {
        const result = ledgerService.getCustomerLedger(customerId, filters);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle("ledgers:get-all", async (_, filters = {}) => {
    try {
      const result = ledgerService.getAllLedgerEntries(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Report handlers
  ipcMain.handle("reports:daily", async (_, date) => {
    try {
      const result = reportService.getDailyReport(date);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("reports:monthly", async (_, { year, month }) => {
    try {
      const result = reportService.getMonthlyReport(year, month);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("reports:cash-flow", async (_, { startDate, endDate }) => {
    try {
      const result = reportService.getCashFlowReport(startDate, endDate);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Service type handlers
  ipcMain.handle("service-types:get-all", async (_, filters = {}) => {
    try {
      const result = serviceTypeService.getServiceTypes(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("service-types:create", async (_, data) => {
    try {
      const result = serviceTypeService.createServiceType(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Inventory handlers
  ipcMain.handle("inventory:items:create", async (_, data) => {
    try {
      const result = inventoryService.createItem(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("inventory:items:update", async (_, { id, data }) => {
    try {
      const result = inventoryService.updateItem(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("inventory:items:get-all", async (_, filters = {}) => {
    try {
      const result = inventoryService.getItems(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("inventory:items:get-by-id", async (_, itemId) => {
    try {
      const result = inventoryService.getItemById(itemId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("inventory:items:get-by-barcode", async (_, barcode) => {
    try {
      const result = inventoryService.getItemByBarcode(barcode);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "inventory:stock:add",
    async (
      _,
      { itemId, variantId, warehouseId, quantity, transaction = {} }
    ) => {
      try {
        const result = inventoryService.addStock(
          itemId,
          variantId,
          warehouseId,
          quantity,
          transaction
        );
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    "inventory:stock:remove",
    async (
      _,
      { itemId, variantId, warehouseId, quantity, transaction = {} }
    ) => {
      try {
        const result = inventoryService.removeStock(
          itemId,
          variantId,
          warehouseId,
          quantity,
          transaction
        );
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    "inventory:stock:transfer",
    async (
      _,
      { itemId, variantId, fromWarehouseId, toWarehouseId, quantity, notes }
    ) => {
      try {
        const result = inventoryService.transferStock(
          itemId,
          variantId,
          fromWarehouseId,
          toWarehouseId,
          quantity,
          notes
        );
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    "inventory:stock:get-levels",
    async (_, { itemId, warehouseId }) => {
      try {
        const result = inventoryService.getStockLevels(itemId, warehouseId);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    "inventory:stock:check-availability",
    async (_, { itemId, variantId, warehouseId, quantity }) => {
      try {
        const result = inventoryService.checkStockAvailability(
          itemId,
          variantId,
          warehouseId,
          quantity
        );
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    "inventory:stock:get-low-stock",
    async (_, warehouseId = null) => {
      try {
        const result = inventoryService.getLowStockItems(warehouseId);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle("inventory:transactions:get-all", async (_, filters = {}) => {
    try {
      const result = inventoryService.getStockTransactions(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "inventory:stock:update-threshold",
    async (_, { itemId, variantId, warehouseId, threshold }) => {
      try {
        const result = inventoryService.updateLowStockThreshold(
          itemId,
          variantId,
          warehouseId,
          threshold
        );
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    "inventory:stock:update-reorder-point",
    async (_, { itemId, variantId, warehouseId, reorderPoint, reorderQuantity }) => {
      try {
        const result = inventoryService.updateReorderPoint(
          itemId,
          variantId,
          warehouseId,
          reorderPoint,
          reorderQuantity
        );
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    "inventory:stock:get-items-needing-reorder",
    async (_, warehouseId = null) => {
      try {
        const result = inventoryService.getItemsNeedingReorder(warehouseId);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    "inventory:stock:get-reorder-suggestions",
    async (_, warehouseId = null) => {
      try {
        const result = inventoryService.getReorderSuggestions(warehouseId);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    "inventory:valuation:calculate",
    async (_, { itemId, variantId, warehouseId, method }) => {
      try {
        const result = inventoryService.getInventoryValuation(
          itemId,
          variantId,
          warehouseId,
          method
        );
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    "inventory:items:update-valuation-method",
    async (_, { itemId, method }) => {
      try {
        const result = inventoryService.updateItemValuationMethod(itemId, method);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    "inventory:valuation:calculate-cogs",
    async (_, { itemId, variantId, warehouseId, quantity, method }) => {
      try {
        const result = inventoryService.calculateCOGS(
          itemId,
          variantId,
          warehouseId,
          quantity,
          method
        );
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  // Warehouse handlers
  ipcMain.handle("warehouses:create", async (_, data) => {
    try {
      const result = warehouseService.createWarehouse(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("warehouses:update", async (_, { id, data }) => {
    try {
      const result = warehouseService.updateWarehouse(id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("warehouses:get-all", async (_, filters = {}) => {
    try {
      const result = warehouseService.getWarehouses(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("warehouses:get-by-id", async (_, warehouseId) => {
    try {
      const result = warehouseService.getWarehouseById(warehouseId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("warehouses:get-default", async () => {
    try {
      const result = warehouseService.getDefaultWarehouse();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Invoice handlers
  ipcMain.handle("invoices:create", async (_, data) => {
    try {
      const result = invoiceService.createInvoice(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("invoices:get-by-id", async (_, invoiceId) => {
    try {
      const result = invoiceService.getInvoice(invoiceId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("invoices:get-all", async (_, filters = {}) => {
    try {
      const result = invoiceService.getInvoices(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("invoices:update-status", async (_, { invoiceId, status }) => {
    try {
      const result = invoiceService.updateInvoiceStatus(invoiceId, status);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("invoices:generate-number", async () => {
    try {
      const result = invoiceService.generateInvoiceNumber();
      return { success: true, data: { invoice_number: result } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Estimate handlers
  ipcMain.handle("estimates:create", async (_, data) => {
    try {
      const result = invoiceService.createEstimate(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("estimates:get-by-id", async (_, estimateId) => {
    try {
      const result = invoiceService.getEstimate(estimateId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("estimates:get-all", async (_, filters = {}) => {
    try {
      const result = invoiceService.getEstimates(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("estimates:convert-to-invoice", async (_, estimateId) => {
    try {
      const result = invoiceService.convertEstimateToInvoice(estimateId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Challan handlers
  ipcMain.handle("challans:create", async (_, data) => {
    try {
      const result = invoiceService.createChallan(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("challans:get-by-id", async (_, challanId) => {
    try {
      const result = invoiceService.getChallan(challanId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("challans:get-all", async (_, filters = {}) => {
    try {
      const result = invoiceService.getChallans(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("challans:convert-to-invoice", async (_, challanId) => {
    try {
      const result = invoiceService.convertChallanToInvoice(challanId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Company settings handlers
  ipcMain.handle("company-settings:get", async () => {
    try {
      const result = invoiceService.getCompanySettings();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("company-settings:update", async (_, data) => {
    try {
      const result = invoiceService.updateCompanySettings(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Tax handlers
  ipcMain.handle("tax:get-rates", async (_, filters = {}) => {
    try {
      const result = taxService.getTaxRates(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("tax:save-rate", async (_, data) => {
    try {
      const result = taxService.saveTaxRate(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "tax:calculate-invoice-taxes",
    async (_, { invoiceItems, customerId, province }) => {
      try {
        const result = taxService.calculateInvoiceTaxes(
          invoiceItems,
          customerId,
          province
        );
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle("tax:get-invoice-taxes", async (_, invoiceId) => {
    try {
      const result = taxService.getInvoiceTaxes(invoiceId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Tax Reports handlers
  ipcMain.handle(
    "tax-reports:generate-str1",
    async (_, { startDate, endDate }) => {
      try {
        const result = taxReportsService.generateSTR1(startDate, endDate);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    "tax-reports:generate-str2",
    async (_, { startDate, endDate }) => {
      try {
        const result = taxReportsService.generateSTR2(startDate, endDate);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    "tax-reports:generate-str3",
    async (_, { startDate, endDate }) => {
      try {
        const result = taxReportsService.generateSTR3(startDate, endDate);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    "tax-reports:generate-pst",
    async (_, { province, startDate, endDate }) => {
      try {
        const result = taxReportsService.generatePSTReturn(
          province,
          startDate,
          endDate
        );
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    "tax-reports:generate-wht",
    async (_, { startDate, endDate }) => {
      try {
        const result = taxReportsService.generateWHTReturn(startDate, endDate);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    "tax-reports:get-summary",
    async (_, { startDate, endDate }) => {
      try {
        const result = taxReportsService.getTaxSummary(startDate, endDate);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle("tax-reports:save-return", async (_, data) => {
    try {
      const result = taxReportsService.saveTaxReturn(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("tax-reports:get-returns", async (_, filters = {}) => {
    try {
      const result = taxReportsService.getTaxReturns(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("tax-reports:get-return", async (_, returnId) => {
    try {
      const result = taxReportsService.getTaxReturn(returnId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Receivables & Payables handlers
  ipcMain.handle("receivables:get-all", async (_, filters = {}) => {
    try {
      const result = receivablesPayablesService.getReceivables(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("receivables:get-summary", async () => {
    try {
      const result = receivablesPayablesService.getReceivablesSummary();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("receivables:get-by-customer", async () => {
    try {
      const result = receivablesPayablesService.getReceivablesByCustomer();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("payables:get-all", async (_, filters = {}) => {
    try {
      const result = receivablesPayablesService.getPayables(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("payables:get-summary", async () => {
    try {
      const result = receivablesPayablesService.getPayablesSummary();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("receivables:get-overdue", async (_, daysThreshold = 0) => {
    try {
      const result =
        receivablesPayablesService.getOverdueInvoices(daysThreshold);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // User handlers
  ipcMain.handle("users:get-all", async (_, filters = {}) => {
    try {
      const result = userService.getUsers(filters);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("users:create", async (_, data) => {
    try {
      const result = userService.createUser(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ========================================
  // Sync handlers
  // ========================================

  ipcMain.handle("sync:full", async () => {
    try {
      const result = await syncService.fullSync();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("sync:upload", async () => {
    try {
      const result = await syncService.uploadPending();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("sync:download", async () => {
    try {
      const result = await syncService.downloadNew();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("sync:status", async () => {
    try {
      const status = syncService.getSyncStatus();
      return { success: true, data: status };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("sync:check-server", async () => {
    try {
      const result = await syncService.checkServerHealth();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("sync:set-server-url", async (_, url) => {
    try {
      syncService.setServerUrl(url);
      dependencyResolver.setServerUrl(url);
      return { success: true, data: { url } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("sync:get-server-url", async () => {
    try {
      const url = syncService.getServerUrl();
      return { success: true, data: { url } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Sync queue handlers
  ipcMain.handle("sync:queue-status", async () => {
    try {
      const stats = syncQueue.getQueueStats();
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("sync:queue-pending", async (_, { tableName, limit } = {}) => {
    try {
      const items = syncQueue.getPendingItems(tableName, limit);
      return { success: true, data: items };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("sync:queue-reset-failed", async (_, tableName = null) => {
    try {
      const result = syncQueue.resetFailedItems(tableName);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("sync:queue-cleanup", async (_, daysOld = 7) => {
    try {
      const result = syncQueue.cleanupCompleted(daysOld);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Shell operations - open external URLs
  ipcMain.handle("shell:open-external", async (_, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error("shell.openExternal error:", error);
      return { success: false, error: error.message };
    }
  });
}

/**
 * Initialize database and handlers
 */
function initializeBackend() {
  try {
    getDatabase();
    runMigrations();
    registerHandlers();
    console.log("Backend initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize backend:", error);
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
