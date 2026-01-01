// ==================== Sync Status ====================

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

// ==================== Base Entity ====================

export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: SyncStatus;
  deviceId?: string;
}

// ==================== User ====================

export type UserRole = 'admin' | 'accountant' | 'data_entry';

export interface User extends BaseEntity {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

// ==================== Customer ====================

export interface Customer extends BaseEntity {
  name: string;
  phone: string;
  address: string;
  outstandingBalance: number;
}

// ==================== Service Type ====================

export interface ServiceType extends BaseEntity {
  name: string;
  description: string;
  price: number;
  isActive?: boolean;
}

// ==================== Job ====================

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface Job extends BaseEntity {
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  amount: number;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  notes?: string;
}

// ==================== Payment ====================

export type PaymentType = 'cash_in' | 'cash_out';
export type PaymentMethod = 'cash' | 'bank';

export interface Payment extends BaseEntity {
  type: PaymentType;
  amount: number;
  method: PaymentMethod;
  customerId?: string;
  customerName?: string;
  jobId?: string;
  description: string;
  date: string;
}

// ==================== Expense ====================

export interface Expense extends BaseEntity {
  category: string;
  amount: number;
  description: string;
  method: PaymentMethod;
  date: string;
}

// ==================== Ledger ====================

export type LedgerEntryType = 
  | 'JOB_CREATED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_MADE'
  | 'EXPENSE_RECORDED'
  | 'ADJUSTMENT'
  | 'OPENING_BALANCE';

export type LedgerReferenceType = 'job' | 'payment' | 'expense' | 'customer' | 'system';

export interface LedgerEntry extends BaseEntity {
  entryType: LedgerEntryType;
  referenceType: LedgerReferenceType;
  referenceId: string;
  customerId?: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  date: string;
}

// ==================== Audit Log ====================

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditLog extends BaseEntity {
  action: AuditAction;
  tableName: string;
  recordId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  userId?: string;
}

// ==================== Reports ====================

export interface DailyReportSummary {
  totalJobsCount: number;
  totalJobsAmount: number;
  totalCashIn: number;
  totalCashOut: number;
  totalExpenses: number;
  netCash: number;
  cashPayments: number;
  bankPayments: number;
}

export interface MonthlyReportSummary {
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
}

// ==================== Invoice ====================

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL' | 'OVERDUE';
export type InvoiceType = 'TAX_INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';

export interface InvoiceItem extends BaseEntity {
  invoiceId: string;
  itemId?: string | null;
  variantId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  serialNumber?: string | null;
}

export interface Invoice extends BaseEntity {
  invoiceNumber: string;
  invoiceType: InvoiceType;
  customerId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  date: string;
  dueDate?: string | null;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  paymentTerms?: string | null;
  notes?: string | null;
  referenceNumber?: string | null;
  items?: InvoiceItem[];
}

// ==================== Estimate ====================

export interface EstimateItem extends BaseEntity {
  estimateId: string;
  itemId?: string | null;
  variantId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
}

export interface Estimate extends BaseEntity {
  estimateNumber: string;
  customerId: string;
  customerName?: string | null;
  date: string;
  validUntil?: string | null;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxAmount: number;
  totalAmount: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  notes?: string | null;
  items?: EstimateItem[];
}

// ==================== Delivery Challan ====================

export interface ChallanItem extends BaseEntity {
  challanId: string;
  itemId?: string | null;
  variantId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
}

export interface DeliveryChallan extends BaseEntity {
  challanNumber: string;
  customerId: string;
  customerName?: string | null;
  date: string;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxAmount: number;
  totalAmount: number;
  status: 'DRAFT' | 'SENT' | 'DELIVERED';
  notes?: string | null;
  items?: ChallanItem[];
}

// ==================== Company Settings ====================

export interface CompanySettings extends BaseEntity {
  companyName: string;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  taxId?: string | null;
  salesTaxRegistration?: string | null;
  signatureUrl?: string | null;
  brandColorPrimary?: string | null;
  brandColorSecondary?: string | null;
}

// ==================== App Settings ====================

export interface AppSettings {
  deviceId?: string;
  serverUrl?: string;
  lastSyncAt?: string;
  appearance?: {
    theme: 'light' | 'dark' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    compactView: boolean;
    showAnimations: boolean;
  };
  notifications?: {
    enabled: boolean;
    lowStockThreshold: number;
    paymentReminders: boolean;
    invoiceDueAlerts: boolean;
    soundEnabled: boolean;
    desktopNotifications: boolean;
  };
  performance?: {
    autoRefreshInterval: number;
    pageSize: number;
    animationsEnabled: boolean;
    offlineMode: boolean;
    cacheSizeLimit: number;
  };
}
