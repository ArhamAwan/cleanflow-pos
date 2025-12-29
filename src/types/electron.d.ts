/**
 * TypeScript definitions for Electron API exposed via preload script
 */

// ==================== Response Types ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==================== Filter Types ====================

export interface CustomerFilters {
  search?: string;
}

export interface JobFilters {
  customerId?: string;
  paymentStatus?: 'paid' | 'partial' | 'unpaid';
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface PaymentFilters {
  type?: 'cash_in' | 'cash_out';
  method?: 'cash' | 'bank';
  customerId?: string;
  jobId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExpenseFilters {
  category?: string;
  method?: 'cash' | 'bank';
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface LedgerFilters {
  startDate?: string;
  endDate?: string;
  entryType?: string;
  customerId?: string;
  limit?: number;
}

export interface ServiceTypeFilters {
  activeOnly?: boolean;
  search?: string;
}

export interface UserFilters {
  activeOnly?: boolean;
  role?: 'admin' | 'accountant' | 'data_entry';
  search?: string;
}

// ==================== Create/Update Data Types ====================

export interface CreateCustomerData {
  name: string;
  phone?: string;
  address?: string;
}

export interface UpdateCustomerData {
  name?: string;
  phone?: string;
  address?: string;
}

export interface CreateJobData {
  customerId: string;
  serviceId: string;
  date: string;
  amount: number;
  notes?: string;
}

export interface UpdateJobData {
  serviceId?: string;
  date?: string;
  amount?: number;
  notes?: string;
}

export interface CreatePaymentData {
  type: 'cash_in' | 'cash_out';
  amount: number;
  method: 'cash' | 'bank';
  customerId?: string;
  jobId?: string;
  description?: string;
  date: string;
}

export interface CreateExpenseData {
  category: string;
  amount: number;
  description?: string;
  method: 'cash' | 'bank';
  date: string;
}

export interface UpdateExpenseData {
  category?: string;
  amount?: number;
  description?: string;
  method?: 'cash' | 'bank';
  date?: string;
}

export interface CreateServiceTypeData {
  name: string;
  description?: string;
  price: number;
}

export interface CreateUserData {
  name: string;
  email: string;
  role: 'admin' | 'accountant' | 'data_entry';
  passwordHash?: string;
}

// ==================== Entity Types (from DB) ====================

export interface DbCustomer {
  id: string;
  name: string;
  phone: string;
  address: string;
  outstandingBalance: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  deviceId: string;
}

export interface DbJob {
  id: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  amount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paidAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  deviceId: string;
}

export interface DbPayment {
  id: string;
  type: 'cash_in' | 'cash_out';
  amount: number;
  method: 'cash' | 'bank';
  customerId?: string;
  customerName?: string;
  jobId?: string;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  deviceId: string;
}

export interface DbExpense {
  id: string;
  category: string;
  amount: number;
  description: string;
  method: 'cash' | 'bank';
  date: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  deviceId: string;
}

export interface DbLedgerEntry {
  id: string;
  entryType: string;
  referenceType: string;
  referenceId: string;
  customerId?: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  date: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  deviceId: string;
}

export interface DbServiceType {
  id: string;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  deviceId: string;
}

export interface DbUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'accountant' | 'data_entry';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  deviceId: string;
}

// ==================== Report Types ====================

export interface DailyReport {
  date: string;
  summary: {
    totalJobsCount: number;
    totalJobsAmount: number;
    totalCashIn: number;
    totalCashOut: number;
    totalExpenses: number;
    netCash: number;
    cashPayments: number;
    bankPayments: number;
  };
  jobs: Array<{
    id: string;
    customerName: string;
    serviceName: string;
    amount: number;
    paymentStatus: string;
    paidAmount: number;
  }>;
  payments: Array<{
    id: string;
    type: string;
    amount: number;
    method: string;
    customerName?: string;
    description: string;
  }>;
  expenses: Array<{
    id: string;
    category: string;
    amount: number;
    description: string;
    method: string;
  }>;
}

export interface MonthlyReport {
  year: number;
  month: number;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    jobs: {
      totalCount: number;
      totalAmount: number;
      totalPaid: number;
      totalUnpaid: number;
      paidCount: number;
      partialCount: number;
      unpaidCount: number;
    };
    payments: {
      totalCashIn: number;
      totalCashOut: number;
      netCash: number;
      cashInCash: number;
      cashInBank: number;
    };
    expenses: {
      total: number;
      count: number;
    };
    netProfit: number;
  };
  breakdown: {
    byCategory: Array<{ category: string; total: number; count: number }>;
    byService: Array<{ service_name: string; job_count: number; total_amount: number }>;
    byDay: Array<{ date: string; job_count: number; total_amount: number }>;
    topCustomers: Array<{ id: string; name: string; job_count: number; total_amount: number }>;
  };
}

export interface CashFlowReport {
  period: {
    startDate: string;
    endDate: string;
  };
  totals: {
    cashIn: number;
    cashOut: number;
    expenses: number;
    netCashFlow: number;
  };
  daily: Array<{
    date: string;
    cashIn: number;
    cashOut: number;
    expenses: number;
    netFlow: number;
    runningBalance: number;
  }>;
}

// ==================== Electron API Interface ====================

export interface ElectronAPI {
  // Platform info
  platform: string;
  version: string;

  // Database
  initDatabase: () => Promise<ApiResponse<{ deviceId: string }>>;
  getDbStatus: () => Promise<ApiResponse<{ deviceId: string; status: string }>>;

  // Customers
  createCustomer: (data: CreateCustomerData) => Promise<ApiResponse<DbCustomer>>;
  updateCustomer: (id: string, data: UpdateCustomerData) => Promise<ApiResponse<DbCustomer>>;
  getCustomers: (filters?: CustomerFilters) => Promise<ApiResponse<DbCustomer[]>>;
  getCustomerById: (id: string) => Promise<ApiResponse<DbCustomer>>;
  getCustomerLedger: (id: string) => Promise<ApiResponse<DbCustomer & { ledgerEntries: DbLedgerEntry[] }>>;

  // Jobs
  createJob: (data: CreateJobData) => Promise<ApiResponse<DbJob>>;
  updateJob: (id: string, data: UpdateJobData) => Promise<ApiResponse<DbJob>>;
  getJobs: (filters?: JobFilters) => Promise<ApiResponse<DbJob[]>>;
  getJobById: (id: string) => Promise<ApiResponse<DbJob>>;

  // Payments
  createPayment: (data: CreatePaymentData) => Promise<ApiResponse<DbPayment>>;
  getPayments: (filters?: PaymentFilters) => Promise<ApiResponse<DbPayment[]>>;
  getPaymentsByJob: (jobId: string) => Promise<ApiResponse<DbPayment[]>>;

  // Expenses
  createExpense: (data: CreateExpenseData) => Promise<ApiResponse<DbExpense>>;
  updateExpense: (id: string, data: UpdateExpenseData) => Promise<ApiResponse<DbExpense>>;
  getExpenses: (filters?: ExpenseFilters) => Promise<ApiResponse<DbExpense[]>>;

  // Ledgers
  getCashLedger: (filters?: LedgerFilters) => Promise<ApiResponse<DbLedgerEntry[]>>;
  getCustomerLedgerEntries: (customerId: string, filters?: LedgerFilters) => Promise<ApiResponse<DbLedgerEntry[]>>;
  getAllLedgerEntries: (filters?: LedgerFilters) => Promise<ApiResponse<DbLedgerEntry[]>>;

  // Reports
  getDailyReport: (date: string) => Promise<ApiResponse<DailyReport>>;
  getMonthlyReport: (year: number, month: number) => Promise<ApiResponse<MonthlyReport>>;
  getCashFlowReport: (startDate: string, endDate: string) => Promise<ApiResponse<CashFlowReport>>;

  // Service Types
  getServiceTypes: (filters?: ServiceTypeFilters) => Promise<ApiResponse<DbServiceType[]>>;
  createServiceType: (data: CreateServiceTypeData) => Promise<ApiResponse<DbServiceType>>;

  // Users
  getUsers: (filters?: UserFilters) => Promise<ApiResponse<DbUser[]>>;
  createUser: (data: CreateUserData) => Promise<ApiResponse<DbUser>>;

  // Legacy
  syncNow: () => Promise<{ success: boolean; timestamp?: number; error?: string }>;
  getAppStatus: () => Promise<{ status: string; version?: string; platform?: string; error?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
