const { v4: uuidv4 } = require("uuid");
const {
  getDatabase,
  getDeviceId,
  getCurrentTimestamp,
} = require("../db/database.cjs");
const taxService = require("./tax.cjs");

/**
 * Generate STR-1 (Sales Tax Return - Sales)
 * This is the monthly return for sales made
 */
function generateSTR1(startDate, endDate) {
  const db = getDatabase();

  // Get all invoices in the period
  const invoices = db
    .prepare(
      `
    SELECT 
      i.*,
      c.name as customer_name,
      c.ntn as customer_ntn
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    WHERE i.date >= ? AND i.date <= ?
      AND i.invoice_type = 'TAX_INVOICE'
      AND i.status != 'CANCELLED'
    ORDER BY i.date, i.invoice_number
  `
    )
    .all(startDate, endDate);

  // Get tax breakdown for each invoice
  const returnData = {
    period: { start: startDate, end: endDate },
    totalInvoices: invoices.length,
    totalSales: 0,
    totalSalesTax: 0,
    totalPST: 0,
    totalWHT: 0,
    invoices: [],
  };

  for (const invoice of invoices) {
    const taxes = taxService.getInvoiceTaxes(invoice.id);
    const salesTax = taxes.find((t) => t.taxType === "SALES_TAX") || {
      taxAmount: 0,
    };
    const pst = taxes.find((t) => t.taxType === "PST") || { taxAmount: 0 };
    const wht = taxes.find((t) => t.taxType === "WHT") || { taxAmount: 0 };

    returnData.totalSales += invoice.subtotal || 0;
    returnData.totalSalesTax += salesTax.taxAmount || 0;
    returnData.totalPST += pst.taxAmount || 0;
    returnData.totalWHT += wht.taxAmount || 0;

    returnData.invoices.push({
      invoiceNumber: invoice.invoice_number,
      date: invoice.date,
      customerName: invoice.customer_name,
      customerNTN: invoice.customer_ntn,
      salesAmount: invoice.subtotal,
      salesTax: salesTax.taxAmount,
      pst: pst.taxAmount,
      wht: wht.taxAmount,
      total: invoice.total_amount,
    });
  }

  return returnData;
}

/**
 * Generate STR-2 (Sales Tax Return - Purchases)
 * This is the monthly return for purchases made
 */
function generateSTR2(startDate, endDate) {
  const db = getDatabase();

  // Get all expenses/purchases in the period
  // Note: This would typically come from purchase invoices or expenses table
  // For now, we'll use expenses table as a placeholder
  const expenses = db
    .prepare(
      `
    SELECT * FROM expenses
    WHERE date >= ? AND date <= ?
      AND is_gst_expense = 1
    ORDER BY date
  `
    )
    .all(startDate, endDate);

  const returnData = {
    period: { start: startDate, end: endDate },
    totalPurchases: expenses.length,
    totalPurchaseAmount: 0,
    totalInputTax: 0,
    purchases: [],
  };

  for (const expense of expenses) {
    const purchaseAmount = expense.amount || 0;
    const inputTax = expense.tax_amount || 0;

    returnData.totalPurchaseAmount += purchaseAmount;
    returnData.totalInputTax += inputTax;

    returnData.purchases.push({
      date: expense.date,
      description: expense.description,
      supplierName: expense.supplier_name || "N/A",
      purchaseAmount,
      inputTax,
      total: purchaseAmount + inputTax,
    });
  }

  return returnData;
}

/**
 * Generate STR-3 (Sales Tax Return - Summary)
 * This is the consolidated return showing net tax payable
 */
function generateSTR3(startDate, endDate) {
  const str1 = generateSTR1(startDate, endDate);
  const str2 = generateSTR2(startDate, endDate);

  const outputTax = str1.totalSalesTax;
  const inputTax = str2.totalInputTax;
  const netTaxPayable = outputTax - inputTax;

  return {
    period: { start: startDate, end: endDate },
    outputTax: {
      total: outputTax,
      salesTax: str1.totalSalesTax,
      pst: str1.totalPST,
    },
    inputTax: {
      total: inputTax,
      purchases: str2.totalInputTax,
    },
    netTaxPayable: netTaxPayable,
    summary: {
      totalSales: str1.totalSales,
      totalPurchases: str2.totalPurchaseAmount,
      taxPayable: netTaxPayable > 0 ? netTaxPayable : 0,
      taxRefundable: netTaxPayable < 0 ? Math.abs(netTaxPayable) : 0,
    },
  };
}

/**
 * Generate Provincial Sales Tax Return
 */
function generatePSTReturn(province, startDate, endDate) {
  const db = getDatabase();

  // Get invoices with PST in the period
  const invoices = db
    .prepare(
      `
    SELECT i.*, c.name as customer_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    WHERE i.date >= ? AND i.date <= ?
      AND i.invoice_type = 'TAX_INVOICE'
      AND i.status != 'CANCELLED'
    ORDER BY i.date
  `
    )
    .all(startDate, endDate);

  const returnData = {
    province,
    period: { start: startDate, end: endDate },
    totalInvoices: 0,
    totalSales: 0,
    totalPST: 0,
    invoices: [],
  };

  for (const invoice of invoices) {
    const taxes = taxService.getInvoiceTaxes(invoice.id);
    const pst = taxes.find((t) => t.taxType === "PST");

    if (pst && pst.taxAmount > 0) {
      returnData.totalInvoices += 1;
      returnData.totalSales += invoice.subtotal || 0;
      returnData.totalPST += pst.taxAmount;

      returnData.invoices.push({
        invoiceNumber: invoice.invoice_number,
        date: invoice.date,
        customerName: invoice.customer_name,
        salesAmount: invoice.subtotal,
        pstAmount: pst.taxAmount,
        pstRate: pst.taxRate,
      });
    }
  }

  return returnData;
}

/**
 * Generate Withholding Tax Return
 */
function generateWHTReturn(startDate, endDate) {
  const db = getDatabase();

  // Get invoices with WHT in the period
  const invoices = db
    .prepare(
      `
    SELECT i.*, c.name as customer_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    WHERE i.date >= ? AND i.date <= ?
      AND i.invoice_type = 'TAX_INVOICE'
      AND i.status != 'CANCELLED'
    ORDER BY i.date
  `
    )
    .all(startDate, endDate);

  const returnData = {
    period: { start: startDate, end: endDate },
    totalInvoices: 0,
    totalSales: 0,
    totalWHT: 0,
    invoices: [],
  };

  for (const invoice of invoices) {
    const taxes = taxService.getInvoiceTaxes(invoice.id);
    const wht = taxes.find((t) => t.taxType === "WHT");

    if (wht && wht.taxAmount > 0) {
      returnData.totalInvoices += 1;
      returnData.totalSales += invoice.subtotal || 0;
      returnData.totalWHT += wht.taxAmount;

      returnData.invoices.push({
        invoiceNumber: invoice.invoice_number,
        date: invoice.date,
        customerName: invoice.customer_name,
        salesAmount: invoice.subtotal,
        whtAmount: wht.taxAmount,
        whtRate: wht.taxRate,
        whtCode: wht.taxCode,
      });
    }
  }

  return returnData;
}

/**
 * Get tax summary for a period
 */
function getTaxSummary(startDate, endDate) {
  const str1 = generateSTR1(startDate, endDate);
  const str2 = generateSTR2(startDate, endDate);
  const str3 = generateSTR3(startDate, endDate);

  return {
    period: { start: startDate, end: endDate },
    sales: {
      totalInvoices: str1.totalInvoices,
      totalSales: str1.totalSales,
      salesTax: str1.totalSalesTax,
      pst: str1.totalPST,
      wht: str1.totalWHT,
    },
    purchases: {
      totalPurchases: str2.totalPurchases,
      totalAmount: str2.totalPurchaseAmount,
      inputTax: str2.totalInputTax,
    },
    netTax: {
      outputTax: str3.outputTax.total,
      inputTax: str3.inputTax.total,
      payable: str3.netTaxPayable > 0 ? str3.netTaxPayable : 0,
      refundable: str3.netTaxPayable < 0 ? Math.abs(str3.netTaxPayable) : 0,
    },
  };
}

/**
 * Save tax return to database
 */
function saveTaxReturn(returnData) {
  const db = getDatabase();
  const deviceId = getDeviceId();
  const now = getCurrentTimestamp();

  const returnId = uuidv4();

  db.prepare(
    `
    INSERT INTO tax_returns (
      id, return_type, period_start, period_end, filing_date, status, return_data,
      created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    returnId,
    returnData.return_type || returnData.returnType,
    returnData.period_start || returnData.periodStart,
    returnData.period_end || returnData.periodEnd,
    returnData.filing_date || returnData.filingDate || null,
    returnData.status || "DRAFT",
    JSON.stringify(returnData.return_data || returnData.returnData || {}),
    now,
    now,
    "PENDING",
    deviceId
  );

  return getTaxReturn(returnId);
}

/**
 * Get tax return by ID
 */
function getTaxReturn(returnId) {
  const db = getDatabase();

  const returnRecord = db
    .prepare("SELECT * FROM tax_returns WHERE id = ?")
    .get(returnId);

  if (!returnRecord) {
    return null;
  }

  return {
    id: returnRecord.id,
    returnType: returnRecord.return_type,
    periodStart: returnRecord.period_start,
    periodEnd: returnRecord.period_end,
    filingDate: returnRecord.filing_date,
    status: returnRecord.status,
    returnData: returnRecord.return_data
      ? JSON.parse(returnRecord.return_data)
      : null,
    createdAt: returnRecord.created_at,
    updatedAt: returnRecord.updated_at,
    syncStatus: returnRecord.sync_status,
    deviceId: returnRecord.device_id,
  };
}

/**
 * Get all tax returns
 */
function getTaxReturns(filters = {}) {
  const db = getDatabase();

  let query = "SELECT * FROM tax_returns WHERE 1=1";
  const params = [];

  if (filters.return_type) {
    query += " AND return_type = ?";
    params.push(filters.return_type);
  }

  if (filters.status) {
    query += " AND status = ?";
    params.push(filters.status);
  }

  query += " ORDER BY period_start DESC, created_at DESC";

  const returns = db.prepare(query).all(...params);

  return returns.map((returnRecord) => ({
    id: returnRecord.id,
    returnType: returnRecord.return_type,
    periodStart: returnRecord.period_start,
    periodEnd: returnRecord.period_end,
    filingDate: returnRecord.filing_date,
    status: returnRecord.status,
    returnData: returnRecord.return_data
      ? JSON.parse(returnRecord.return_data)
      : null,
    createdAt: returnRecord.created_at,
    updatedAt: returnRecord.updated_at,
    syncStatus: returnRecord.sync_status,
    deviceId: returnRecord.device_id,
  }));
}

module.exports = {
  generateSTR1,
  generateSTR2,
  generateSTR3,
  generatePSTReturn,
  generateWHTReturn,
  getTaxSummary,
  saveTaxReturn,
  getTaxReturn,
  getTaxReturns,
};
