/**
 * TypeScript definitions for Electron API exposed via preload script
 * This ensures type safety when using window.electronAPI in React components
 */

import { Customer, Job, Payment, Expense, LedgerEntry, ServiceType, User } from './index';

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
  update: (id: string, data: Partial<Customer>) => Promise<APIResponse<Customer>>;
  getAll: (filters?: Record<string, unknown>) => Promise<APIResponse<Customer[]>>;
  getById: (id: string) => Promise<APIResponse<Customer>>;
  getLedger: (id: string) => Promise<APIResponse<Customer & { ledger: LedgerEntry[] }>>;
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
  getAll: (filters?: Record<string, unknown>) => Promise<APIResponse<Payment[]>>;
  getByJob: (jobId: string) => Promise<APIResponse<Payment[]>>;
}

/**
 * Expense API
 */
export interface ExpenseAPI {
  create: (data: Partial<Expense>) => Promise<APIResponse<Expense>>;
  update: (id: string, data: Partial<Expense>) => Promise<APIResponse<Expense>>;
  getAll: (filters?: Record<string, unknown>) => Promise<APIResponse<Expense[]>>;
}

/**
 * Ledger API
 */
export interface LedgerAPI {
  getCash: (filters?: Record<string, unknown>) => Promise<APIResponse<LedgerEntry[]>>;
  getCustomer: (customerId: string, filters?: Record<string, unknown>) => Promise<APIResponse<LedgerEntry[]>>;
  getAll: (filters?: Record<string, unknown>) => Promise<APIResponse<LedgerEntry[]>>;
}

/**
 * Report API
 */
export interface ReportAPI {
  getDaily: (date: string) => Promise<APIResponse<Record<string, unknown>>>;
  getMonthly: (year: number, month: number) => Promise<APIResponse<Record<string, unknown>>>;
  getCashFlow: (startDate: string, endDate: string) => Promise<APIResponse<Record<string, unknown>>>;
}

/**
 * Service Type API
 */
export interface ServiceTypeAPI {
  getAll: (filters?: Record<string, unknown>) => Promise<APIResponse<ServiceType[]>>;
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
 * Test/Sync Utility API
 */
export interface TestAPI {
  getDeviceId: () => Promise<APIResponse<{ deviceId: string }>>;
  getSyncStats: () => Promise<APIResponse<{
    stats: Record<string, {
      PENDING: number;
      SYNCED: number;
      FAILED: number;
      TOTAL: number;
    }>;
    totalPending: number;
  }>>;
  getPendingRecords: (tableName: string, limit?: number) => Promise<APIResponse<{
    records: unknown[];
    count: number;
  }>>;
  getAllPending: (limit?: number) => Promise<APIResponse<{
    allPending: Record<string, unknown[]>;
    totalPending: number;
  }>>;
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

  // Test/Sync utility operations
  test: TestAPI;

  // Legacy methods (kept for backward compatibility)
  syncNow: () => Promise<APIResponse<{ deviceId: string; status: string }>>;
  getAppStatus: () => Promise<APIResponse<{ deviceId: string; status: string }>>;

  // Platform information
  platform: string;
  version: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
