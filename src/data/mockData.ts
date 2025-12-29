/**
 * Utility functions for data formatting
 * Mock data has been removed - app now uses database only
 */

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
