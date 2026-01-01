const { getDatabase, getCurrentTimestamp } = require('../db/database.cjs');

/**
 * Get receivables (customers who owe money)
 * Based on invoices with outstanding balances
 */
function getReceivables(filters = {}) {
  const db = getDatabase();
  
  // Get all unpaid/partial invoices
  let query = `
    SELECT 
      c.id as customer_id,
      c.name as customer_name,
      c.phone,
      c.address,
      c.outstanding_balance as customer_balance,
      i.id as invoice_id,
      i.invoice_number,
      i.date as invoice_date,
      i.due_date,
      i.total_amount,
      i.status
    FROM invoices i
    INNER JOIN customers c ON i.customer_id = c.id
    WHERE i.status IN ('SENT', 'PARTIAL', 'OVERDUE')
      AND c.outstanding_balance > 0
  `;
  
  const params = [];
  
  if (filters.customerId) {
    query += ' AND c.id = ?';
    params.push(filters.customerId);
  }
  
  query += ' ORDER BY i.due_date ASC, i.total_amount DESC';
  
  const invoices = db.prepare(query).all(...params);
  
  // Calculate outstanding per invoice
  // For PARTIAL status, estimate 50% paid, for others use full amount
  const receivables = [];
  
  for (const inv of invoices) {
    let outstandingAmount = 0;
    let paidAmount = 0;
    
    if (inv.status === 'PARTIAL') {
      // Estimate: assume 50% paid for partial invoices
      outstandingAmount = inv.total_amount * 0.5;
      paidAmount = inv.total_amount * 0.5;
    } else {
      // SENT or OVERDUE: full amount outstanding
      outstandingAmount = inv.total_amount;
      paidAmount = 0;
    }
    
    // Ensure outstanding doesn't exceed customer's total balance
    if (outstandingAmount > inv.customer_balance) {
      outstandingAmount = inv.customer_balance;
      paidAmount = inv.total_amount - outstandingAmount;
    }
    
    if (outstandingAmount > 0) {
      receivables.push({
        customer_id: inv.customer_id,
        customer_name: inv.customer_name,
        phone: inv.phone,
        address: inv.address,
        invoice_id: inv.invoice_id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        total_amount: inv.total_amount,
        paid_amount: paidAmount,
        outstanding_amount: outstandingAmount,
        status: inv.status,
      });
    }
  }
  
  // Calculate aging for each receivable
  const today = new Date();
  const receivablesWithAging = receivables.map(rec => {
    const dueDate = rec.due_date ? new Date(rec.due_date) : new Date(rec.invoice_date);
    const daysOverdue = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)));
    
    let ageCategory = 'current';
    if (daysOverdue > 90) {
      ageCategory = '90+';
    } else if (daysOverdue > 60) {
      ageCategory = '61-90';
    } else if (daysOverdue > 30) {
      ageCategory = '31-60';
    } else if (daysOverdue > 0) {
      ageCategory = '0-30';
    }
    
    return {
      customerId: rec.customer_id,
      customerName: rec.customer_name,
      phone: rec.phone,
      address: rec.address,
      invoiceId: rec.invoice_id,
      invoiceNumber: rec.invoice_number,
      invoiceDate: rec.invoice_date,
      dueDate: rec.due_date,
      totalAmount: rec.total_amount,
      paidAmount: rec.paid_amount,
      outstandingAmount: rec.outstanding_amount,
      status: rec.status,
      daysOverdue,
      ageCategory,
    };
  });
  
  return receivablesWithAging;
}

/**
 * Get receivables summary with aging analysis
 */
function getReceivablesSummary() {
  const receivables = getReceivables();
  
  const summary = {
    totalReceivables: 0,
    totalCustomers: new Set(),
    aging: {
      '0-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 },
      '90+': { count: 0, amount: 0 },
      current: { count: 0, amount: 0 },
    },
  };
  
  for (const rec of receivables) {
    summary.totalReceivables += rec.outstandingAmount;
    summary.totalCustomers.add(rec.customerId);
    summary.aging[rec.ageCategory].count++;
    summary.aging[rec.ageCategory].amount += rec.outstandingAmount;
  }
  
  summary.totalCustomers = summary.totalCustomers.size;
  
  return summary;
}

/**
 * Get receivables by customer (grouped)
 */
function getReceivablesByCustomer() {
  const receivables = getReceivables();
  
  const byCustomer = {};
  
  for (const rec of receivables) {
    if (!byCustomer[rec.customerId]) {
      byCustomer[rec.customerId] = {
        customerId: rec.customerId,
        customerName: rec.customerName,
        phone: rec.phone,
        address: rec.address,
        totalOutstanding: 0,
        invoices: [],
        oldestInvoiceDate: null,
        daysOutstanding: 0,
      };
    }
    
    byCustomer[rec.customerId].totalOutstanding += rec.outstandingAmount;
    byCustomer[rec.customerId].invoices.push({
      invoiceId: rec.invoiceId,
      invoiceNumber: rec.invoiceNumber,
      invoiceDate: rec.invoiceDate,
      dueDate: rec.dueDate,
      outstandingAmount: rec.outstandingAmount,
      daysOverdue: rec.daysOverdue,
      ageCategory: rec.ageCategory,
    });
    
    // Track oldest invoice
    const invoiceDate = new Date(rec.invoiceDate);
    if (!byCustomer[rec.customerId].oldestInvoiceDate || 
        invoiceDate < new Date(byCustomer[rec.customerId].oldestInvoiceDate)) {
      byCustomer[rec.customerId].oldestInvoiceDate = rec.invoiceDate;
      byCustomer[rec.customerId].daysOutstanding = rec.daysOverdue;
    }
  }
  
  // Convert to array and sort by total outstanding
  return Object.values(byCustomer).sort((a, b) => 
    b.totalOutstanding - a.totalOutstanding
  );
}

/**
 * Get payables (suppliers/vendors you owe)
 * Based on expenses and purchase invoices
 */
function getPayables(filters = {}) {
  const db = getDatabase();
  
  // For now, we'll use expenses as payables
  // In a full system, you'd have a suppliers table and purchase invoices
  let query = `
    SELECT 
      e.id as expense_id,
      e.category,
      e.description,
      e.amount,
      e.date as expense_date,
      e.method,
      e.supplier_name,
      e.is_gst_expense,
      e.tax_amount
    FROM expenses e
    WHERE 1=1
  `;
  
  const params = [];
  
  if (filters.supplierName) {
    query += ' AND e.supplier_name LIKE ?';
    params.push(`%${filters.supplierName}%`);
  }
  
  if (filters.category) {
    query += ' AND e.category = ?';
    params.push(filters.category);
  }
  
  query += ' ORDER BY e.date DESC';
  
  const expenses = db.prepare(query).all(...params);
  
  // Calculate aging for expenses (if they're unpaid)
  const today = new Date();
  const payables = expenses.map(exp => {
    const expenseDate = new Date(exp.expense_date);
    const daysOutstanding = Math.floor((today - expenseDate) / (1000 * 60 * 60 * 24));
    
    let ageCategory = 'current';
    if (daysOutstanding > 90) {
      ageCategory = '90+';
    } else if (daysOutstanding > 60) {
      ageCategory = '61-90';
    } else if (daysOutstanding > 30) {
      ageCategory = '31-60';
    } else if (daysOutstanding > 0) {
      ageCategory = '0-30';
    }
    
    return {
      expenseId: exp.expense_id,
      supplierName: exp.supplier_name || exp.category,
      description: exp.description,
      amount: exp.amount,
      expenseDate: exp.expense_date,
      daysOutstanding,
      ageCategory,
      category: exp.category,
      method: exp.method,
      isGstExpense: exp.is_gst_expense === 1,
      taxAmount: exp.tax_amount || 0,
    };
  });
  
  return payables;
}

/**
 * Get payables summary
 */
function getPayablesSummary() {
  const payables = getPayables();
  
  const summary = {
    totalPayables: 0,
    totalSuppliers: new Set(),
    aging: {
      '0-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 },
      '90+': { count: 0, amount: 0 },
      current: { count: 0, amount: 0 },
    },
  };
  
  for (const pay of payables) {
    summary.totalPayables += pay.amount;
    summary.totalSuppliers.add(pay.supplierName);
    summary.aging[pay.ageCategory].count++;
    summary.aging[pay.ageCategory].amount += pay.amount;
  }
  
  summary.totalSuppliers = summary.totalSuppliers.size;
  
  return summary;
}

/**
 * Get overdue invoices (for payment reminders)
 */
function getOverdueInvoices(daysThreshold = 0) {
  const receivables = getReceivables();
  const today = new Date();
  
  return receivables.filter(rec => {
    if (!rec.dueDate) return false;
    const dueDate = new Date(rec.dueDate);
    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
    return daysOverdue >= daysThreshold;
  });
}

module.exports = {
  getReceivables,
  getReceivablesSummary,
  getReceivablesByCustomer,
  getPayables,
  getPayablesSummary,
  getOverdueInvoices,
};

