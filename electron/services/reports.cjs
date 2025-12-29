const { getDatabase } = require('../db/database.cjs');

/**
 * Report Service
 * Generates financial reports from SQLite data
 * All reports work completely offline
 */

/**
 * Get daily report for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Object} Daily report
 */
function getDailyReport(date) {
  const db = getDatabase();
  
  // Get jobs for the day
  const jobs = db.prepare(`
    SELECT j.*, c.name as customer_name, s.name as service_name
    FROM jobs j
    LEFT JOIN customers c ON j.customer_id = c.id
    LEFT JOIN service_types s ON j.service_id = s.id
    WHERE j.date = ?
    ORDER BY j.created_at DESC
  `).all(date);
  
  // Get payments for the day
  const payments = db.prepare(`
    SELECT p.*, c.name as customer_name
    FROM payments p
    LEFT JOIN customers c ON p.customer_id = c.id
    WHERE p.date = ?
    ORDER BY p.created_at DESC
  `).all(date);
  
  // Get expenses for the day
  const expenses = db.prepare(`
    SELECT * FROM expenses
    WHERE date = ?
    ORDER BY created_at DESC
  `).all(date);
  
  // Calculate totals
  const totalJobsAmount = jobs.reduce((sum, j) => sum + j.amount, 0);
  const totalJobsCount = jobs.length;
  
  const totalCashIn = payments
    .filter(p => p.type === 'cash_in')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalCashOut = payments
    .filter(p => p.type === 'cash_out')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Payment method breakdown
  const cashPayments = payments
    .filter(p => p.type === 'cash_in' && p.method === 'cash')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const bankPayments = payments
    .filter(p => p.type === 'cash_in' && p.method === 'bank')
    .reduce((sum, p) => sum + p.amount, 0);
  
  return {
    date,
    summary: {
      totalJobsCount,
      totalJobsAmount,
      totalCashIn,
      totalCashOut,
      totalExpenses,
      netCash: totalCashIn - totalCashOut - totalExpenses,
      cashPayments,
      bankPayments,
    },
    jobs: jobs.map(j => ({
      id: j.id,
      customerName: j.customer_name,
      serviceName: j.service_name,
      amount: j.amount,
      paymentStatus: j.payment_status,
      paidAmount: j.paid_amount,
    })),
    payments: payments.map(p => ({
      id: p.id,
      type: p.type,
      amount: p.amount,
      method: p.method,
      customerName: p.customer_name,
      description: p.description,
    })),
    expenses: expenses.map(e => ({
      id: e.id,
      category: e.category,
      amount: e.amount,
      description: e.description,
      method: e.method,
    })),
  };
}

/**
 * Get monthly report for a specific month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Object} Monthly report
 */
function getMonthlyReport(year, month) {
  const db = getDatabase();
  
  // Create date range
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  
  // Get jobs summary
  const jobsSummary = db.prepare(`
    SELECT 
      COUNT(*) as total_count,
      COALESCE(SUM(amount), 0) as total_amount,
      COALESCE(SUM(paid_amount), 0) as total_paid,
      COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_count,
      COUNT(CASE WHEN payment_status = 'partial' THEN 1 END) as partial_count,
      COUNT(CASE WHEN payment_status = 'unpaid' THEN 1 END) as unpaid_count
    FROM jobs
    WHERE date >= ? AND date <= ?
  `).get(startDate, endDate);
  
  // Get payments summary
  const paymentsSummary = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'cash_in' THEN amount ELSE 0 END), 0) as total_cash_in,
      COALESCE(SUM(CASE WHEN type = 'cash_out' THEN amount ELSE 0 END), 0) as total_cash_out,
      COALESCE(SUM(CASE WHEN type = 'cash_in' AND method = 'cash' THEN amount ELSE 0 END), 0) as cash_in_cash,
      COALESCE(SUM(CASE WHEN type = 'cash_in' AND method = 'bank' THEN amount ELSE 0 END), 0) as cash_in_bank
    FROM payments
    WHERE date >= ? AND date <= ?
  `).get(startDate, endDate);
  
  // Get expenses summary
  const expensesSummary = db.prepare(`
    SELECT 
      COALESCE(SUM(amount), 0) as total,
      COUNT(*) as count
    FROM expenses
    WHERE date >= ? AND date <= ?
  `).get(startDate, endDate);
  
  // Get expenses by category
  const expensesByCategory = db.prepare(`
    SELECT 
      category,
      COALESCE(SUM(amount), 0) as total,
      COUNT(*) as count
    FROM expenses
    WHERE date >= ? AND date <= ?
    GROUP BY category
    ORDER BY total DESC
  `).all(startDate, endDate);
  
  // Get service type breakdown
  const serviceBreakdown = db.prepare(`
    SELECT 
      s.name as service_name,
      COUNT(j.id) as job_count,
      COALESCE(SUM(j.amount), 0) as total_amount
    FROM jobs j
    JOIN service_types s ON j.service_id = s.id
    WHERE j.date >= ? AND j.date <= ?
    GROUP BY s.id, s.name
    ORDER BY total_amount DESC
  `).all(startDate, endDate);
  
  // Get daily breakdown
  const dailyBreakdown = db.prepare(`
    SELECT 
      date,
      COUNT(*) as job_count,
      COALESCE(SUM(amount), 0) as total_amount
    FROM jobs
    WHERE date >= ? AND date <= ?
    GROUP BY date
    ORDER BY date
  `).all(startDate, endDate);
  
  // Get top customers
  const topCustomers = db.prepare(`
    SELECT 
      c.id,
      c.name,
      COUNT(j.id) as job_count,
      COALESCE(SUM(j.amount), 0) as total_amount
    FROM jobs j
    JOIN customers c ON j.customer_id = c.id
    WHERE j.date >= ? AND j.date <= ?
    GROUP BY c.id, c.name
    ORDER BY total_amount DESC
    LIMIT 10
  `).all(startDate, endDate);
  
  return {
    year,
    month,
    period: {
      startDate,
      endDate,
    },
    summary: {
      jobs: {
        totalCount: jobsSummary.total_count,
        totalAmount: jobsSummary.total_amount,
        totalPaid: jobsSummary.total_paid,
        totalUnpaid: jobsSummary.total_amount - jobsSummary.total_paid,
        paidCount: jobsSummary.paid_count,
        partialCount: jobsSummary.partial_count,
        unpaidCount: jobsSummary.unpaid_count,
      },
      payments: {
        totalCashIn: paymentsSummary.total_cash_in,
        totalCashOut: paymentsSummary.total_cash_out,
        netCash: paymentsSummary.total_cash_in - paymentsSummary.total_cash_out,
        cashInCash: paymentsSummary.cash_in_cash,
        cashInBank: paymentsSummary.cash_in_bank,
      },
      expenses: {
        total: expensesSummary.total,
        count: expensesSummary.count,
      },
      netProfit: paymentsSummary.total_cash_in - paymentsSummary.total_cash_out - expensesSummary.total,
    },
    breakdown: {
      byCategory: expensesByCategory,
      byService: serviceBreakdown,
      byDay: dailyBreakdown,
      topCustomers,
    },
  };
}

/**
 * Get cash flow report for a date range
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Object} Cash flow report
 */
function getCashFlowReport(startDate, endDate) {
  const db = getDatabase();
  
  // Get daily cash flow
  const dailyCashFlow = db.prepare(`
    SELECT 
      date,
      COALESCE(SUM(CASE WHEN type = 'cash_in' THEN amount ELSE 0 END), 0) as cash_in,
      COALESCE(SUM(CASE WHEN type = 'cash_out' THEN amount ELSE 0 END), 0) as cash_out
    FROM payments
    WHERE date >= ? AND date <= ?
    GROUP BY date
    ORDER BY date
  `).all(startDate, endDate);
  
  // Get daily expenses
  const dailyExpenses = db.prepare(`
    SELECT 
      date,
      COALESCE(SUM(amount), 0) as expenses
    FROM expenses
    WHERE date >= ? AND date <= ?
    GROUP BY date
    ORDER BY date
  `).all(startDate, endDate);
  
  // Merge cash flow with expenses
  const expenseMap = new Map(dailyExpenses.map(e => [e.date, e.expenses]));
  
  const cashFlowWithExpenses = dailyCashFlow.map(cf => ({
    date: cf.date,
    cashIn: cf.cash_in,
    cashOut: cf.cash_out,
    expenses: expenseMap.get(cf.date) || 0,
    netFlow: cf.cash_in - cf.cash_out - (expenseMap.get(cf.date) || 0),
  }));
  
  // Calculate running balance
  let runningBalance = 0;
  const cashFlowWithBalance = cashFlowWithExpenses.map(cf => {
    runningBalance += cf.netFlow;
    return {
      ...cf,
      runningBalance,
    };
  });
  
  // Get totals
  const totals = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'cash_in' THEN amount ELSE 0 END), 0) as total_cash_in,
      COALESCE(SUM(CASE WHEN type = 'cash_out' THEN amount ELSE 0 END), 0) as total_cash_out
    FROM payments
    WHERE date >= ? AND date <= ?
  `).get(startDate, endDate);
  
  const totalExpenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE date >= ? AND date <= ?
  `).get(startDate, endDate);
  
  return {
    period: {
      startDate,
      endDate,
    },
    totals: {
      cashIn: totals.total_cash_in,
      cashOut: totals.total_cash_out,
      expenses: totalExpenses.total,
      netCashFlow: totals.total_cash_in - totals.total_cash_out - totalExpenses.total,
    },
    daily: cashFlowWithBalance,
  };
}

/**
 * Get customer aging report
 * Shows outstanding balances by age
 * @returns {Object} Aging report
 */
function getCustomerAgingReport() {
  const db = getDatabase();
  
  const customers = db.prepare(`
    SELECT 
      c.id,
      c.name,
      c.phone,
      c.outstanding_balance,
      (
        SELECT MIN(j.date)
        FROM jobs j
        WHERE j.customer_id = c.id AND j.payment_status != 'paid'
      ) as oldest_unpaid_date
    FROM customers c
    WHERE c.outstanding_balance > 0
    ORDER BY c.outstanding_balance DESC
  `).all();
  
  const today = new Date();
  
  const agingData = customers.map(c => {
    let ageCategory = 'current';
    let daysOutstanding = 0;
    
    if (c.oldest_unpaid_date) {
      const oldestDate = new Date(c.oldest_unpaid_date);
      daysOutstanding = Math.floor((today - oldestDate) / (1000 * 60 * 60 * 24));
      
      if (daysOutstanding > 90) {
        ageCategory = '90+';
      } else if (daysOutstanding > 60) {
        ageCategory = '61-90';
      } else if (daysOutstanding > 30) {
        ageCategory = '31-60';
      } else if (daysOutstanding > 0) {
        ageCategory = '1-30';
      }
    }
    
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      outstandingBalance: c.outstanding_balance,
      daysOutstanding,
      ageCategory,
    };
  });
  
  // Group by age category
  const byCategory = {
    current: { count: 0, total: 0 },
    '1-30': { count: 0, total: 0 },
    '31-60': { count: 0, total: 0 },
    '61-90': { count: 0, total: 0 },
    '90+': { count: 0, total: 0 },
  };
  
  for (const customer of agingData) {
    byCategory[customer.ageCategory].count++;
    byCategory[customer.ageCategory].total += customer.outstandingBalance;
  }
  
  return {
    customers: agingData,
    summary: byCategory,
    totalOutstanding: agingData.reduce((sum, c) => sum + c.outstandingBalance, 0),
  };
}

/**
 * Get service performance report
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Object} Service performance report
 */
function getServicePerformanceReport(startDate, endDate) {
  const db = getDatabase();
  
  const services = db.prepare(`
    SELECT 
      s.id,
      s.name,
      s.price as base_price,
      COUNT(j.id) as job_count,
      COALESCE(SUM(j.amount), 0) as total_revenue,
      COALESCE(AVG(j.amount), 0) as avg_amount,
      COUNT(CASE WHEN j.payment_status = 'paid' THEN 1 END) as paid_count,
      COUNT(CASE WHEN j.payment_status = 'unpaid' THEN 1 END) as unpaid_count
    FROM service_types s
    LEFT JOIN jobs j ON s.id = j.service_id AND j.date >= ? AND j.date <= ?
    GROUP BY s.id, s.name, s.price
    ORDER BY total_revenue DESC
  `).all(startDate, endDate);
  
  const totalRevenue = services.reduce((sum, s) => sum + s.total_revenue, 0);
  
  return {
    period: {
      startDate,
      endDate,
    },
    services: services.map(s => ({
      id: s.id,
      name: s.name,
      basePrice: s.base_price,
      jobCount: s.job_count,
      totalRevenue: s.total_revenue,
      avgAmount: s.avg_amount,
      paidCount: s.paid_count,
      unpaidCount: s.unpaid_count,
      revenuePercentage: totalRevenue > 0 ? (s.total_revenue / totalRevenue * 100).toFixed(2) : 0,
    })),
    totalRevenue,
    totalJobsCount: services.reduce((sum, s) => sum + s.job_count, 0),
  };
}

module.exports = {
  getDailyReport,
  getMonthlyReport,
  getCashFlowReport,
  getCustomerAgingReport,
  getServicePerformanceReport,
};
