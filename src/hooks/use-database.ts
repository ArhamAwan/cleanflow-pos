import { useState, useCallback } from 'react';
import { useElectron } from './use-electron';
import type {
  Customer,
  Job,
  Payment,
  Expense,
  ServiceType,
  LedgerEntry,
} from '@/types';

/**
 * Hook for database initialization
 */
export function useDatabaseInit() {
  const { isElectron, electronAPI } = useElectron();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const initDatabase = useCallback(async () => {
    if (!isElectron || !electronAPI) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await electronAPI.db.init();
      if (result.success && result.data) {
        setDeviceId(result.data.deviceId);
        setIsInitialized(true);
      } else {
        setError(result.error || 'Failed to initialize database');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [isElectron, electronAPI]);

  // Auto-initialize on mount
  useState(() => {
    if (isElectron && electronAPI) {
      initDatabase();
    }
  });

  return { isInitialized, isLoading, error, deviceId, isElectron };
}

/**
 * Hook for customer operations
 */
export function useCustomers() {
  const { isElectron, electronAPI } = useElectron();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async (search?: string) => {
    if (!isElectron || !electronAPI) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await electronAPI.customers.getAll({ search });
      if (result.success && result.data) {
        setCustomers(result.data as Customer[]);
      } else {
        setError(result.error || 'Failed to fetch customers');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [isElectron, electronAPI]);

  const createCustomer = useCallback(async (data: { name: string; phone?: string; address?: string }) => {
    if (!isElectron || !electronAPI) return null;

    try {
      const result = await electronAPI.customers.create(data);
      if (result.success && result.data) {
        // Refresh the customers list after creating
        await fetchCustomers();
        return result.data as Customer;
      }
      throw new Error(result.error || 'Failed to create customer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [isElectron, electronAPI, fetchCustomers]);

  const updateCustomer = useCallback(async (id: string, data: { name?: string; phone?: string; address?: string }) => {
    if (!isElectron || !electronAPI) return null;

    try {
      const result = await electronAPI.customers.update(id, data);
      if (result.success && result.data) {
        // Refresh the customers list after updating
        await fetchCustomers();
        return result.data as Customer;
      }
      throw new Error(result.error || 'Failed to update customer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [isElectron, electronAPI, fetchCustomers]);

  return { customers, isLoading, error, fetchCustomers, createCustomer, updateCustomer };
}

/**
 * Hook for job operations
 */
export function useJobs() {
  const { isElectron, electronAPI } = useElectron();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async (filters?: {
    customerId?: string;
    paymentStatus?: 'paid' | 'partial' | 'unpaid';
    startDate?: string;
    endDate?: string;
    search?: string;
  }) => {
    if (!isElectron || !electronAPI) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await electronAPI.jobs.getAll(filters);
      if (result.success && result.data) {
        setJobs(result.data as Job[]);
      } else {
        setError(result.error || 'Failed to fetch jobs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [isElectron, electronAPI]);

  const createJob = useCallback(async (data: {
    customerId: string;
    serviceId: string;
    date: string;
    amount: number;
    notes?: string;
  }) => {
    if (!isElectron || !electronAPI) return null;

    try {
      const result = await electronAPI.jobs.create(data);
      if (result.success && result.data) {
        await fetchJobs();
        return result.data as Job;
      }
      throw new Error(result.error || 'Failed to create job');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [isElectron, electronAPI, fetchJobs]);

  return { jobs, isLoading, error, fetchJobs, createJob };
}

/**
 * Hook for payment operations
 */
export function usePayments() {
  const { isElectron, electronAPI } = useElectron();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async (filters?: {
    type?: 'cash_in' | 'cash_out';
    method?: 'cash' | 'bank';
    customerId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    if (!isElectron || !electronAPI) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await electronAPI.payments.getAll(filters);
      if (result.success && result.data) {
        setPayments(result.data as Payment[]);
      } else {
        setError(result.error || 'Failed to fetch payments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [isElectron, electronAPI]);

  const createPayment = useCallback(async (data: {
    type: 'cash_in' | 'cash_out';
    amount: number;
    method: 'cash' | 'bank';
    customerId?: string;
    jobId?: string;
    description?: string;
    date: string;
  }) => {
    if (!isElectron || !electronAPI) return null;

    try {
      const result = await electronAPI.payments.create(data);
      if (result.success && result.data) {
        await fetchPayments();
        return result.data as Payment;
      }
      throw new Error(result.error || 'Failed to create payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [isElectron, electronAPI, fetchPayments]);

  return { payments, isLoading, error, fetchPayments, createPayment };
}

/**
 * Hook for expense operations
 */
export function useExpenses() {
  const { isElectron, electronAPI } = useElectron();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async (filters?: {
    category?: string;
    method?: 'cash' | 'bank';
    startDate?: string;
    endDate?: string;
    search?: string;
  }) => {
    if (!isElectron || !electronAPI) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await electronAPI.expenses.getAll(filters);
      if (result.success && result.data) {
        setExpenses(result.data as Expense[]);
      } else {
        setError(result.error || 'Failed to fetch expenses');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [isElectron, electronAPI]);

  const createExpense = useCallback(async (data: {
    category: string;
    amount: number;
    description?: string;
    method: 'cash' | 'bank';
    date: string;
  }) => {
    if (!isElectron || !electronAPI) return null;

    try {
      const result = await electronAPI.expenses.create(data);
      if (result.success && result.data) {
        await fetchExpenses();
        return result.data as Expense;
      }
      throw new Error(result.error || 'Failed to create expense');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [isElectron, electronAPI, fetchExpenses]);

  return { expenses, isLoading, error, fetchExpenses, createExpense };
}

/**
 * Hook for service type operations
 */
export function useServiceTypes() {
  const { isElectron, electronAPI } = useElectron();
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServiceTypes = useCallback(async () => {
    if (!isElectron || !electronAPI) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await electronAPI.serviceTypes.getAll();
      if (result.success && result.data) {
        setServiceTypes(result.data as ServiceType[]);
      } else {
        setError(result.error || 'Failed to fetch service types');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [isElectron, electronAPI]);

  const createServiceType = useCallback(async (data: {
    name: string;
    description?: string;
    price: number;
  }) => {
    if (!isElectron || !electronAPI) return null;

    try {
      const result = await electronAPI.serviceTypes.create(data);
      if (result.success && result.data) {
        await fetchServiceTypes();
        return result.data as ServiceType;
      }
      throw new Error(result.error || 'Failed to create service type');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [isElectron, electronAPI, fetchServiceTypes]);

  return { serviceTypes, isLoading, error, fetchServiceTypes, createServiceType };
}

/**
 * Hook for ledger operations
 */
export function useLedger() {
  const { isElectron, electronAPI } = useElectron();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCashLedger = useCallback(async (filters?: {
    startDate?: string;
    endDate?: string;
  }) => {
    if (!isElectron || !electronAPI) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await electronAPI.ledgers.getCash(filters);
      if (result.success && result.data) {
        setEntries(result.data as LedgerEntry[]);
      } else {
        setError(result.error || 'Failed to fetch cash ledger');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [isElectron, electronAPI]);

  const fetchCustomerLedger = useCallback(async (customerId: string, filters?: {
    startDate?: string;
    endDate?: string;
  }) => {
    if (!isElectron || !electronAPI) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await electronAPI.ledgers.getCustomer(customerId, filters);
      if (result.success && result.data) {
        setEntries(result.data as LedgerEntry[]);
      } else {
        setError(result.error || 'Failed to fetch customer ledger');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [isElectron, electronAPI]);

  return { entries, isLoading, error, fetchCashLedger, fetchCustomerLedger };
}

/**
 * Hook for report operations
 */
export function useReports() {
  const { isElectron, electronAPI } = useElectron();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDailyReport = useCallback(async (date: string) => {
    if (!isElectron || !electronAPI) return null;

    setIsLoading(true);
    setError(null);

    try {
      const result = await electronAPI.reports.getDaily(date);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to get daily report');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isElectron, electronAPI]);

  const getMonthlyReport = useCallback(async (year: number, month: number) => {
    if (!isElectron || !electronAPI) return null;

    setIsLoading(true);
    setError(null);

    try {
      const result = await electronAPI.reports.getMonthly(year, month);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to get monthly report');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isElectron, electronAPI]);

  return { isLoading, error, getDailyReport, getMonthlyReport };
}
