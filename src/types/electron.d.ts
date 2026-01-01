/**
 * TypeScript definitions for Electron API exposed via preload script
 * This ensures type safety when using window.electronAPI in React components
 */

import {
  Customer,
  Job,
  Payment,
  Expense,
  LedgerEntry,
  ServiceType,
  User,
  Item,
  Warehouse,
  StockLevel,
  LowStockAlert,
  StockTransaction,
  Invoice,
  InvoiceItem,
  Estimate,
  EstimateItem,
  DeliveryChallan,
  ChallanItem,
  CompanySettings,
  TaxRate,
  InvoiceTax,
  TaxReturn,
  ValuationMethod,
  InventoryValuation,
  ReorderSuggestion,
  ItemNeedingReorder,
} from "./index";

/**
 * Standard API response structure
 */
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Database API
 */
export interface DatabaseAPI {
  init: () => Promise<APIResponse<{ deviceId: string }>>;
  status: () => Promise<APIResponse<{ deviceId: string; status: string }>>;
}

/**
 * Customer API
 */
export interface CustomerAPI {
  create: (data: Partial<Customer>) => Promise<APIResponse<Customer>>;
  update: (
    id: string,
    data: Partial<Customer>
  ) => Promise<APIResponse<Customer>>;
  getAll: (
    filters?: Record<string, unknown>
  ) => Promise<APIResponse<Customer[]>>;
  getById: (id: string) => Promise<APIResponse<Customer>>;
  getLedger: (
    id: string
  ) => Promise<APIResponse<Customer & { ledger: LedgerEntry[] }>>;
}

/**
 * Job API
 */
export interface JobAPI {
  create: (data: Partial<Job>) => Promise<APIResponse<Job>>;
  update: (id: string, data: Partial<Job>) => Promise<APIResponse<Job>>;
  getAll: (filters?: Record<string, unknown>) => Promise<APIResponse<Job[]>>;
  getById: (id: string) => Promise<APIResponse<Job>>;
}

/**
 * Payment API
 */
export interface PaymentAPI {
  create: (data: Partial<Payment>) => Promise<APIResponse<Payment>>;
  getAll: (
    filters?: Record<string, unknown>
  ) => Promise<APIResponse<Payment[]>>;
  getByJob: (jobId: string) => Promise<APIResponse<Payment[]>>;
}

/**
 * Expense API
 */
export interface ExpenseAPI {
  create: (data: Partial<Expense>) => Promise<APIResponse<Expense>>;
  update: (id: string, data: Partial<Expense>) => Promise<APIResponse<Expense>>;
  getAll: (
    filters?: Record<string, unknown>
  ) => Promise<APIResponse<Expense[]>>;
}

/**
 * Ledger API
 */
export interface LedgerAPI {
  getCash: (
    filters?: Record<string, unknown>
  ) => Promise<APIResponse<LedgerEntry[]>>;
  getCustomer: (
    customerId: string,
    filters?: Record<string, unknown>
  ) => Promise<APIResponse<LedgerEntry[]>>;
  getAll: (
    filters?: Record<string, unknown>
  ) => Promise<APIResponse<LedgerEntry[]>>;
}

/**
 * Report API
 */
export interface ReportAPI {
  getDaily: (date: string) => Promise<APIResponse<Record<string, unknown>>>;
  getMonthly: (
    year: number,
    month: number
  ) => Promise<APIResponse<Record<string, unknown>>>;
  getCashFlow: (
    startDate: string,
    endDate: string
  ) => Promise<APIResponse<Record<string, unknown>>>;
}

/**
 * Service Type API
 */
export interface ServiceTypeAPI {
  getAll: (
    filters?: Record<string, unknown>
  ) => Promise<APIResponse<ServiceType[]>>;
  create: (data: Partial<ServiceType>) => Promise<APIResponse<ServiceType>>;
}

/**
 * User API
 */
export interface UserAPI {
  getAll: (filters?: Record<string, unknown>) => Promise<APIResponse<User[]>>;
  create: (data: Partial<User>) => Promise<APIResponse<User>>;
}

/**
 * Inventory API
 */
export interface InventoryAPI {
  items: {
    create: (data: Partial<Item>) => Promise<APIResponse<Item>>;
    update: (id: string, data: Partial<Item>) => Promise<APIResponse<Item>>;
    getAll: (filters?: Record<string, unknown>) => Promise<APIResponse<Item[]>>;
    getById: (id: string) => Promise<APIResponse<Item>>;
    getByBarcode: (
      barcode: string
    ) => Promise<APIResponse<{ type: "item" | "variant"; data: Item } | null>>;
    updateValuationMethod: (params: {
      itemId: string;
      method: ValuationMethod;
    }) => Promise<APIResponse<Record<string, unknown>>>;
  };
  stock: {
    add: (params: {
      itemId: string;
      variantId?: string;
      warehouseId: string;
      quantity: number;
      transaction?: Record<string, unknown>;
    }) => Promise<APIResponse<Record<string, unknown>>>;
    remove: (params: {
      itemId: string;
      variantId?: string;
      warehouseId: string;
      quantity: number;
      transaction?: Record<string, unknown>;
    }) => Promise<APIResponse<Record<string, unknown>>>;
    transfer: (params: {
      itemId: string;
      variantId?: string;
      fromWarehouseId: string;
      toWarehouseId: string;
      quantity: number;
      notes?: string;
    }) => Promise<APIResponse<Record<string, unknown>>>;
    getLevels: (params: {
      itemId: string;
      warehouseId?: string;
    }) => Promise<APIResponse<StockLevel[]>>;
    checkAvailability: (params: {
      itemId: string;
      variantId?: string;
      warehouseId: string;
      quantity: number;
    }) => Promise<
      APIResponse<{ available: number; reserved: number; total: number }>
    >;
    getLowStock: (
      warehouseId?: string | null
    ) => Promise<APIResponse<LowStockAlert[]>>;
    updateThreshold: (params: {
      itemId: string;
      variantId?: string;
      warehouseId: string;
      threshold: number;
    }) => Promise<APIResponse<Record<string, unknown>>>;
    updateReorderPoint: (params: {
      itemId: string;
      variantId?: string;
      warehouseId: string;
      reorderPoint: number;
      reorderQuantity: number;
    }) => Promise<APIResponse<Record<string, unknown>>>;
    getItemsNeedingReorder: (
      warehouseId?: string | null
    ) => Promise<APIResponse<ItemNeedingReorder[]>>;
    getReorderSuggestions: (
      warehouseId?: string | null
    ) => Promise<APIResponse<ReorderSuggestion[]>>;
  };
  valuation: {
    calculate: (params: {
      itemId: string;
      variantId?: string;
      warehouseId: string;
      method: ValuationMethod;
    }) => Promise<APIResponse<InventoryValuation>>;
    calculateCOGS: (params: {
      itemId: string;
      variantId?: string;
      warehouseId: string;
      quantity: number;
      method?: ValuationMethod;
    }) => Promise<APIResponse<{ totalCost: number; quantity: number; method: ValuationMethod }>>;
  };
  transactions: {
    getAll: (
      filters?: Record<string, unknown>
    ) => Promise<APIResponse<StockTransaction[]>>;
  };
}

/**
 * Warehouse API
 */
export interface WarehouseAPI {
  create: (data: Partial<Warehouse>) => Promise<APIResponse<Warehouse>>;
  update: (
    id: string,
    data: Partial<Warehouse>
  ) => Promise<APIResponse<Warehouse>>;
  getAll: (
    filters?: Record<string, unknown>
  ) => Promise<APIResponse<Warehouse[]>>;
  getById: (id: string) => Promise<APIResponse<Warehouse>>;
  getDefault: () => Promise<APIResponse<Warehouse | null>>;
}

/**
 * Invoice API
 */
export interface InvoiceAPI {
  create: (data: Partial<Invoice>) => Promise<APIResponse<Invoice>>;
  getById: (id: string) => Promise<APIResponse<Invoice>>;
  getAll: (
    filters?: Record<string, unknown>
  ) => Promise<APIResponse<Invoice[]>>;
  updateStatus: (
    invoiceId: string,
    status: string
  ) => Promise<APIResponse<Invoice>>;
  generateNumber: () => Promise<APIResponse<{ invoice_number: string }>>;
}

/**
 * Estimate API
 */
export interface EstimateAPI {
  create: (data: Partial<Estimate>) => Promise<APIResponse<Estimate>>;
  getById: (id: string) => Promise<APIResponse<Estimate>>;
  getAll: (
    filters?: Record<string, unknown>
  ) => Promise<APIResponse<Estimate[]>>;
  convertToInvoice: (estimateId: string) => Promise<APIResponse<Invoice>>;
}

/**
 * Challan API
 */
export interface ChallanAPI {
  create: (
    data: Partial<DeliveryChallan>
  ) => Promise<APIResponse<DeliveryChallan>>;
  getById: (id: string) => Promise<APIResponse<DeliveryChallan>>;
  getAll: (
    filters?: Record<string, unknown>
  ) => Promise<APIResponse<DeliveryChallan[]>>;
  convertToInvoice: (challanId: string) => Promise<APIResponse<Invoice>>;
}

/**
 * Company Settings API
 */
export interface CompanySettingsAPI {
  get: () => Promise<APIResponse<CompanySettings>>;
  update: (
    data: Partial<CompanySettings>
  ) => Promise<APIResponse<CompanySettings>>;
}

/**
 * Tax API
 */
export interface TaxAPI {
  getRates: (
    filters?: Record<string, unknown>
  ) => Promise<APIResponse<TaxRate[]>>;
  saveRate: (data: Partial<TaxRate>) => Promise<APIResponse<TaxRate>>;
  calculateInvoiceTaxes: (
    invoiceItems: unknown[],
    customerId?: string,
    province?: string
  ) => Promise<
    APIResponse<{
      taxableAmount: number;
      salesTax: { rate: number; amount: number };
      pst: { rate: number; amount: number; province?: string };
      wht: { rate: number; amount: number };
      totalTax: number;
    }>
  >;
  getInvoiceTaxes: (invoiceId: string) => Promise<APIResponse<InvoiceTax[]>>;
}

/**
 * Receivables API
 */
export interface ReceivablesAPI {
  getAll: (
    filters?: Record<string, unknown>
  ) => Promise<APIResponse<unknown[]>>;
  getSummary: () => Promise<
    APIResponse<{
      totalReceivables: number;
      totalCustomers: number;
      aging: Record<string, { count: number; amount: number }>;
    }>
  >;
  getByCustomer: () => Promise<APIResponse<unknown[]>>;
  getOverdue: (daysThreshold?: number) => Promise<APIResponse<unknown[]>>;
}

/**
 * Payables API
 */
export interface PayablesAPI {
  getAll: (
    filters?: Record<string, unknown>
  ) => Promise<APIResponse<unknown[]>>;
  getSummary: () => Promise<
    APIResponse<{
      totalPayables: number;
      totalSuppliers: number;
      aging: Record<string, { count: number; amount: number }>;
    }>
  >;
}

/**
 * Tax Reports API
 */
export interface TaxReportsAPI {
  generateSTR1: (
    startDate: string,
    endDate: string
  ) => Promise<APIResponse<unknown>>;
  generateSTR2: (
    startDate: string,
    endDate: string
  ) => Promise<APIResponse<unknown>>;
  generateSTR3: (
    startDate: string,
    endDate: string
  ) => Promise<APIResponse<unknown>>;
  generatePST: (
    province: string,
    startDate: string,
    endDate: string
  ) => Promise<APIResponse<unknown>>;
  generateWHT: (
    startDate: string,
    endDate: string
  ) => Promise<APIResponse<unknown>>;
  getSummary: (
    startDate: string,
    endDate: string
  ) => Promise<APIResponse<unknown>>;
  saveReturn: (data: Partial<TaxReturn>) => Promise<APIResponse<TaxReturn>>;
  getReturns: (
    filters?: Record<string, unknown>
  ) => Promise<APIResponse<TaxReturn[]>>;
  getReturn: (returnId: string) => Promise<APIResponse<TaxReturn>>;
}

/**
 * Test/Sync Utility API
 */
export interface TestAPI {
  getDeviceId: () => Promise<APIResponse<{ deviceId: string }>>;
  getSyncStats: () => Promise<
    APIResponse<{
      stats: Record<
        string,
        {
          PENDING: number;
          SYNCED: number;
          FAILED: number;
          TOTAL: number;
        }
      >;
      totalPending: number;
    }>
  >;
  getPendingRecords: (
    tableName: string,
    limit?: number
  ) => Promise<
    APIResponse<{
      records: unknown[];
      count: number;
    }>
  >;
  getAllPending: (limit?: number) => Promise<
    APIResponse<{
      allPending: Record<string, unknown[]>;
      totalPending: number;
    }>
  >;
}

/**
 * Sync Status
 */
export interface SyncStatus {
  isSyncing: boolean;
  lastSyncAt: string | null;
  progress: {
    phase: string;
    tables: Record<string, { phase: string; result?: Record<string, unknown> }>;
    startedAt: string;
    completedAt?: string;
  } | null;
  pendingRecords: number;
  statistics: Record<
    string,
    {
      PENDING: number;
      SYNCED: number;
      FAILED: number;
    }
  >;
}

/**
 * Sync Result
 */
export interface SyncResult {
  success: boolean;
  upload?: Record<
    string,
    {
      tableName: string;
      uploaded: number;
      synced: number;
      failed: number;
      error?: string;
    }
  >;
  download?: Record<
    string,
    {
      tableName: string;
      downloaded: number;
      inserted: number;
      updated: number;
      error?: string;
    }
  >;
  totalUploaded?: number;
  totalDownloaded?: number;
  errors?: Array<{ table: string; phase: string; error: string }>;
  lastSyncAt?: string;
  error?: string;
}

/**
 * Queue Status
 */
export interface QueueStatus {
  byTable: Record<string, Record<string, number>>;
  byStatus: {
    PENDING: number;
    PROCESSING: number;
    COMPLETED: number;
    FAILED: number;
  };
  totalQueued: number;
}

/**
 * Sync API
 */
export interface SyncAPI {
  fullSync: () => Promise<APIResponse<SyncResult>>;
  upload: () => Promise<APIResponse<SyncResult>>;
  download: () => Promise<APIResponse<SyncResult>>;
  getStatus: () => Promise<APIResponse<SyncStatus>>;
  checkServer: () => Promise<APIResponse<{ online: boolean; error?: string }>>;
  setServerUrl: (url: string) => Promise<APIResponse<{ url: string }>>;
  getServerUrl: () => Promise<APIResponse<{ url: string }>>;
  getQueueStatus: () => Promise<APIResponse<QueueStatus>>;
  getQueuePending: (
    tableName?: string,
    limit?: number
  ) => Promise<APIResponse<unknown[]>>;
  resetFailedQueue: (
    tableName?: string
  ) => Promise<APIResponse<{ reset: number }>>;
  cleanupQueue: (daysOld?: number) => Promise<APIResponse<{ deleted: number }>>;
}

/**
 * Main Electron API interface
 */
export interface ElectronAPI {
  // Database operations
  db: DatabaseAPI;

  // Business operations
  customers: CustomerAPI;
  jobs: JobAPI;
  payments: PaymentAPI;
  expenses: ExpenseAPI;
  ledgers: LedgerAPI;
  reports: ReportAPI;
  serviceTypes: ServiceTypeAPI;
  users: UserAPI;
  inventory: InventoryAPI;
  warehouses: WarehouseAPI;
  invoices: InvoiceAPI;
  estimates: EstimateAPI;
  challans: ChallanAPI;
  companySettings: CompanySettingsAPI;
  tax: TaxAPI;
  taxReports: TaxReportsAPI;
  receivables: ReceivablesAPI;
  payables: PayablesAPI;

  // Test/Sync utility operations
  test: TestAPI;

  // Sync operations
  sync: SyncAPI;

  // Legacy methods (kept for backward compatibility)
  syncNow: () => Promise<APIResponse<{ deviceId: string; status: string }>>;
  getAppStatus: () => Promise<
    APIResponse<{ deviceId: string; status: string }>
  >;

  // Platform information
  platform: string;
  version: string;

  // Shell operations
  openExternal: (url: string) => Promise<APIResponse<void>>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
