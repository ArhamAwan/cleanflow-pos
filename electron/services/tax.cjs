const { v4: uuidv4 } = require("uuid");
const {
  getDatabase,
  getDeviceId,
  getCurrentTimestamp,
} = require("../db/database.cjs");

/**
 * Get applicable tax rate for a given date and tax type
 */
function getTaxRate(taxType, date = null) {
  const db = getDatabase();
  const checkDate = date || getCurrentTimestamp();

  const rate = db
    .prepare(
      `
    SELECT * FROM tax_rates
    WHERE tax_type = ?
      AND is_active = 1
      AND applicable_from <= ?
      AND (applicable_to IS NULL OR applicable_to >= ?)
    ORDER BY applicable_from DESC
    LIMIT 1
  `
    )
    .get(taxType, checkDate, checkDate);

  return rate ? rate.rate : getDefaultTaxRate(taxType);
}

/**
 * Get default tax rate if none configured
 */
function getDefaultTaxRate(taxType) {
  // Default Pakistani tax rates
  const defaults = {
    SALES_TAX: 17, // 17% Federal Sales Tax
    PST: 0, // Provincial Sales Tax (varies by province, default 0)
    WHT: 0, // Withholding Tax (varies by type, default 0)
  };

  return defaults[taxType] || 0;
}

/**
 * Calculate Sales Tax (Federal)
 */
function calculateSalesTax(amount, isExempt = false) {
  if (isExempt) {
    return { rate: 0, amount: 0 };
  }

  const rate = getTaxRate("SALES_TAX");
  const taxAmount = (amount * rate) / 100;

  return { rate, amount: taxAmount };
}

/**
 * Calculate Provincial Sales Tax (PST)
 * Province can be: 'SINDH', 'PUNJAB', 'KPK', 'BALOCHISTAN', 'GB', 'AJK'
 */
function calculatePST(amount, province = null, isExempt = false) {
  if (isExempt) {
    return { rate: 0, amount: 0, province: null };
  }

  // PST rates vary by province (typically 0-16%)
  // For now, use configured rate or default
  const rate = getTaxRate("PST");
  const taxAmount = (amount * rate) / 100;

  return { rate, amount: taxAmount, province };
}

/**
 * Calculate Withholding Tax (WHT)
 * whtType can be: 'SALES', 'SERVICES', 'CONTRACT', 'IMPORT', etc.
 */
function calculateWHT(amount, whtType = null, isExempt = false) {
  if (isExempt) {
    return { rate: 0, amount: 0, whtType: null };
  }

  // WHT rates vary by type (typically 1-10%)
  const rate = getTaxRate("WHT");
  const taxAmount = (amount * rate) / 100;

  return { rate, amount: taxAmount, whtType };
}

/**
 * Get tax exemptions for a customer
 */
function getTaxExemptions(customerId) {
  const db = getDatabase();

  // Check if customer has tax exemption
  // This would typically be stored in customers table or a separate exemptions table
  // For now, return default (no exemptions)
  const customer = db
    .prepare("SELECT * FROM customers WHERE id = ?")
    .get(customerId);

  if (!customer) {
    return {
      salesTaxExempt: false,
      pstExempt: false,
      whtExempt: false,
    };
  }

  // If customer table has exemption fields, use them
  // For now, return defaults
  return {
    salesTaxExempt: false,
    pstExempt: false,
    whtExempt: false,
  };
}

/**
 * Calculate all taxes for invoice items
 * Returns breakdown of Sales Tax, PST, and WHT
 */
function calculateInvoiceTaxes(
  invoiceItems,
  customerId = null,
  province = null
) {
  let totalSalesTax = 0;
  let totalPST = 0;
  let totalWHT = 0;
  let totalTaxableAmount = 0;

  // Get customer exemptions if customer ID provided
  const exemptions = customerId
    ? getTaxExemptions(customerId)
    : {
        salesTaxExempt: false,
        pstExempt: false,
        whtExempt: false,
      };

  // Calculate taxes for each item
  for (const item of invoiceItems) {
    const lineSubtotal = item.quantity * item.unit_price;
    const lineDiscount = item.discount_amount || 0;
    const taxableAmount = lineSubtotal - lineDiscount;

    totalTaxableAmount += taxableAmount;

    // Calculate Sales Tax
    if (!exemptions.salesTaxExempt) {
      const salesTax = calculateSalesTax(taxableAmount, false);
      totalSalesTax += salesTax.amount;
    }

    // Calculate PST (if applicable)
    if (!exemptions.pstExempt && province) {
      const pst = calculatePST(taxableAmount, province, false);
      totalPST += pst.amount;
    }

    // Calculate WHT (if applicable - typically on services)
    if (!exemptions.whtExempt) {
      const wht = calculateWHT(taxableAmount, "SALES", false);
      totalWHT += wht.amount;
    }
  }

  return {
    taxableAmount: totalTaxableAmount,
    salesTax: {
      rate: getTaxRate("SALES_TAX"),
      amount: totalSalesTax,
    },
    pst: {
      rate: getTaxRate("PST"),
      amount: totalPST,
      province,
    },
    wht: {
      rate: getTaxRate("WHT"),
      amount: totalWHT,
    },
    totalTax: totalSalesTax + totalPST + totalWHT,
  };
}

/**
 * Save invoice tax breakdown to database
 */
function saveInvoiceTaxes(invoiceId, taxBreakdown) {
  const db = getDatabase();
  const deviceId = getDeviceId();
  const now = getCurrentTimestamp();

  // Delete existing tax records for this invoice
  db.prepare("DELETE FROM invoice_taxes WHERE invoice_id = ?").run(invoiceId);

  const insertTax = db.prepare(`
    INSERT INTO invoice_taxes (
      id, invoice_id, tax_type, tax_rate, taxable_amount, tax_amount, tax_code,
      created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTaxes = db.transaction((taxes) => {
    for (const tax of taxes) {
      if (tax.amount > 0) {
        insertTax.run(
          uuidv4(),
          invoiceId,
          tax.taxType,
          tax.rate,
          taxBreakdown.taxableAmount,
          tax.amount,
          tax.taxCode || null,
          now,
          now,
          "PENDING",
          deviceId
        );
      }
    }
  });

  const taxes = [];
  if (taxBreakdown.salesTax.amount > 0) {
    taxes.push({
      taxType: "SALES_TAX",
      rate: taxBreakdown.salesTax.rate,
      amount: taxBreakdown.salesTax.amount,
      taxCode: "ST",
    });
  }
  if (taxBreakdown.pst.amount > 0) {
    taxes.push({
      taxType: "PST",
      rate: taxBreakdown.pst.rate,
      amount: taxBreakdown.pst.amount,
      taxCode: "PST",
    });
  }
  if (taxBreakdown.wht.amount > 0) {
    taxes.push({
      taxType: "WHT",
      rate: taxBreakdown.wht.rate,
      amount: taxBreakdown.wht.amount,
      taxCode: "WHT",
    });
  }

  if (taxes.length > 0) {
    insertTaxes(taxes);
  }
}

/**
 * Get tax rates (all or filtered)
 */
function getTaxRates(filters = {}) {
  const db = getDatabase();

  let query = "SELECT * FROM tax_rates WHERE 1=1";
  const params = [];

  if (filters.tax_type) {
    query += " AND tax_type = ?";
    params.push(filters.tax_type);
  }

  if (filters.is_active !== undefined) {
    query += " AND is_active = ?";
    params.push(filters.is_active ? 1 : 0);
  }

  query += " ORDER BY applicable_from DESC";

  const rates = db.prepare(query).all(...params);

  return rates.map((rate) => ({
    id: rate.id,
    taxType: rate.tax_type,
    rate: rate.rate,
    applicableFrom: rate.applicable_from,
    applicableTo: rate.applicable_to,
    isActive: rate.is_active === 1,
    createdAt: rate.created_at,
    updatedAt: rate.updated_at,
    syncStatus: rate.sync_status,
    deviceId: rate.device_id,
  }));
}

/**
 * Create or update tax rate
 */
function saveTaxRate(rateData) {
  const db = getDatabase();
  const deviceId = getDeviceId();
  const now = getCurrentTimestamp();

  if (rateData.id) {
    // Update existing
    db.prepare(
      `
      UPDATE tax_rates
      SET tax_type = ?,
          rate = ?,
          applicable_from = ?,
          applicable_to = ?,
          is_active = ?,
          updated_at = ?,
          sync_status = 'PENDING'
      WHERE id = ?
    `
    ).run(
      rateData.tax_type || rateData.taxType,
      rateData.rate,
      rateData.applicable_from || rateData.applicableFrom,
      rateData.applicable_to || rateData.applicableTo || null,
      rateData.is_active !== undefined
        ? rateData.is_active
          ? 1
          : 0
        : rateData.isActive
        ? 1
        : 0,
      now,
      rateData.id
    );

    return getTaxRates({ tax_type: rateData.tax_type || rateData.taxType })[0];
  } else {
    // Create new
    const rateId = uuidv4();

    db.prepare(
      `
      INSERT INTO tax_rates (
        id, tax_type, rate, applicable_from, applicable_to, is_active,
        created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      rateId,
      rateData.tax_type || rateData.taxType,
      rateData.rate,
      rateData.applicable_from || rateData.applicableFrom || now,
      rateData.applicable_to || rateData.applicableTo || null,
      rateData.is_active !== undefined
        ? rateData.is_active
          ? 1
          : 0
        : rateData.isActive !== undefined
        ? rateData.isActive
          ? 1
          : 0
        : 1,
      now,
      now,
      "PENDING",
      deviceId
    );

    return getTaxRates({ tax_type: rateData.tax_type || rateData.taxType })[0];
  }
}

/**
 * Get invoice tax breakdown
 */
function getInvoiceTaxes(invoiceId) {
  const db = getDatabase();

  const taxes = db
    .prepare(
      `
    SELECT * FROM invoice_taxes
    WHERE invoice_id = ?
    ORDER BY tax_type
  `
    )
    .all(invoiceId);

  return taxes.map((tax) => ({
    id: tax.id,
    invoiceId: tax.invoice_id,
    taxType: tax.tax_type,
    taxRate: tax.tax_rate,
    taxableAmount: tax.taxable_amount,
    taxAmount: tax.tax_amount,
    taxCode: tax.tax_code,
    createdAt: tax.created_at,
    updatedAt: tax.updated_at,
    syncStatus: tax.sync_status,
    deviceId: tax.device_id,
  }));
}

module.exports = {
  getTaxRate,
  calculateSalesTax,
  calculatePST,
  calculateWHT,
  getTaxExemptions,
  calculateInvoiceTaxes,
  saveInvoiceTaxes,
  getTaxRates,
  saveTaxRate,
  getInvoiceTaxes,
};
