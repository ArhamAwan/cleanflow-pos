import { User, Customer, ServiceType, Job, Payment, Expense, LedgerEntry } from '@/types';

export const mockUsers: User[] = [
  { id: '1', name: 'Ahmed Khan', email: 'ahmed@sanitech.pk', role: 'admin', isActive: true },
  { id: '2', name: 'Bilal Hussain', email: 'bilal@sanitech.pk', role: 'accountant', isActive: true },
  { id: '3', name: 'Faisal Ali', email: 'faisal@sanitech.pk', role: 'data_entry', isActive: true },
  { id: '4', name: 'Zain Malik', email: 'zain@sanitech.pk', role: 'data_entry', isActive: false },
];

export const mockCustomers: Customer[] = [
  { id: '1', name: 'Karachi Hospital', phone: '021-34567890', address: 'Clifton, Karachi', outstandingBalance: 45000 },
  { id: '2', name: 'Lahore University', phone: '042-35678901', address: 'Gulberg, Lahore', outstandingBalance: 0 },
  { id: '3', name: 'Islamabad Mall', phone: '051-26789012', address: 'Blue Area, Islamabad', outstandingBalance: 28500 },
  { id: '4', name: 'Faisal Tower', phone: '021-37890123', address: 'PECHS, Karachi', outstandingBalance: 15000 },
  { id: '5', name: 'National Bank HQ', phone: '021-38901234', address: 'I.I. Chundrigar Rd, Karachi', outstandingBalance: 0 },
];

export const mockServiceTypes: ServiceType[] = [
  { id: '1', name: 'Deep Cleaning', description: 'Complete deep cleaning service', price: 15000 },
  { id: '2', name: 'Regular Cleaning', description: 'Standard cleaning service', price: 8000 },
  { id: '3', name: 'Washroom Sanitization', description: 'Complete washroom sanitization', price: 5000 },
  { id: '4', name: 'Floor Polishing', description: 'Floor cleaning and polishing', price: 12000 },
  { id: '5', name: 'Window Cleaning', description: 'Glass and window cleaning', price: 6000 },
];

export const mockJobs: Job[] = [
  { id: 'JOB-001', customerId: '1', customerName: 'Karachi Hospital', serviceId: '1', serviceName: 'Deep Cleaning', date: '2024-12-28', amount: 15000, paymentStatus: 'paid', paidAmount: 15000 },
  { id: 'JOB-002', customerId: '3', customerName: 'Islamabad Mall', serviceId: '2', serviceName: 'Regular Cleaning', date: '2024-12-28', amount: 8000, paymentStatus: 'partial', paidAmount: 5000 },
  { id: 'JOB-003', customerId: '4', customerName: 'Faisal Tower', serviceId: '3', serviceName: 'Washroom Sanitization', date: '2024-12-28', amount: 5000, paymentStatus: 'unpaid', paidAmount: 0 },
  { id: 'JOB-004', customerId: '2', customerName: 'Lahore University', serviceId: '4', serviceName: 'Floor Polishing', date: '2024-12-27', amount: 12000, paymentStatus: 'paid', paidAmount: 12000 },
  { id: 'JOB-005', customerId: '5', customerName: 'National Bank HQ', serviceId: '1', serviceName: 'Deep Cleaning', date: '2024-12-27', amount: 15000, paymentStatus: 'paid', paidAmount: 15000 },
  { id: 'JOB-006', customerId: '1', customerName: 'Karachi Hospital', serviceId: '5', serviceName: 'Window Cleaning', date: '2024-12-26', amount: 6000, paymentStatus: 'partial', paidAmount: 3000 },
];

export const mockPayments: Payment[] = [
  { id: 'PAY-001', type: 'cash_in', amount: 15000, method: 'bank', customerId: '1', customerName: 'Karachi Hospital', jobId: 'JOB-001', description: 'Payment for Deep Cleaning', date: '2024-12-28' },
  { id: 'PAY-002', type: 'cash_in', amount: 5000, method: 'cash', customerId: '3', customerName: 'Islamabad Mall', jobId: 'JOB-002', description: 'Partial payment for Regular Cleaning', date: '2024-12-28' },
  { id: 'PAY-003', type: 'cash_out', amount: 3500, method: 'cash', description: 'Staff transportation', date: '2024-12-28' },
  { id: 'PAY-004', type: 'cash_in', amount: 12000, method: 'bank', customerId: '2', customerName: 'Lahore University', jobId: 'JOB-004', description: 'Payment for Floor Polishing', date: '2024-12-27' },
  { id: 'PAY-005', type: 'cash_out', amount: 8000, method: 'bank', description: 'Cleaning supplies purchase', date: '2024-12-27' },
];

export const mockExpenses: Expense[] = [
  { id: 'EXP-001', category: 'Transportation', amount: 3500, description: 'Staff transportation to Karachi Hospital', method: 'cash', date: '2024-12-28' },
  { id: 'EXP-002', category: 'Supplies', amount: 8000, description: 'Cleaning chemicals and equipment', method: 'bank', date: '2024-12-27' },
  { id: 'EXP-003', category: 'Utilities', amount: 12000, description: 'Office electricity bill', method: 'bank', date: '2024-12-25' },
  { id: 'EXP-004', category: 'Staff Salary', amount: 45000, description: 'Monthly salary for cleaning staff', method: 'bank', date: '2024-12-01' },
  { id: 'EXP-005', category: 'Maintenance', amount: 5000, description: 'Equipment repair', method: 'cash', date: '2024-12-20' },
];

export const mockCashLedger: LedgerEntry[] = [
  { id: '1', date: '2024-12-01', description: 'Opening Balance', debit: 0, credit: 0, balance: 100000 },
  { id: '2', date: '2024-12-01', description: 'Staff Salary Payment', debit: 45000, credit: 0, balance: 55000 },
  { id: '3', date: '2024-12-20', description: 'Equipment Repair', debit: 5000, credit: 0, balance: 50000 },
  { id: '4', date: '2024-12-25', description: 'Electricity Bill', debit: 12000, credit: 0, balance: 38000 },
  { id: '5', date: '2024-12-27', description: 'Payment from Lahore University', debit: 0, credit: 12000, balance: 50000 },
  { id: '6', date: '2024-12-27', description: 'Cleaning Supplies', debit: 8000, credit: 0, balance: 42000 },
  { id: '7', date: '2024-12-28', description: 'Payment from Karachi Hospital', debit: 0, credit: 15000, balance: 57000 },
  { id: '8', date: '2024-12-28', description: 'Payment from Islamabad Mall', debit: 0, credit: 5000, balance: 62000 },
  { id: '9', date: '2024-12-28', description: 'Staff Transportation', debit: 3500, credit: 0, balance: 58500 },
];

export const expenseCategories = [
  'Transportation',
  'Supplies',
  'Utilities',
  'Staff Salary',
  'Maintenance',
  'Office Expenses',
  'Fuel',
  'Equipment',
  'Other',
];

export const formatCurrency = (amount: number): string => {
  return `PKR ${amount.toLocaleString('en-PK')}`;
};
