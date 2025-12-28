export type UserRole = 'admin' | 'accountant' | 'data_entry';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  outstandingBalance: number;
}

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  price: number;
}

export interface Job {
  id: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  amount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paidAmount: number;
}

export interface Payment {
  id: string;
  type: 'cash_in' | 'cash_out';
  amount: number;
  method: 'cash' | 'bank';
  customerId?: string;
  customerName?: string;
  jobId?: string;
  description: string;
  date: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  method: 'cash' | 'bank';
  date: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}
