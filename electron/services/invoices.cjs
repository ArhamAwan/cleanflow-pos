const { v4: uuidv4 } = require("uuid");
const {
  getDatabase,
  getDeviceId: getDeviceIdFromDB,
  getCurrentTimestamp: getCurrentTimestampFromDB,
} = require("../db/database.cjs");
const {
  createLedgerEntry,
  ENTRY_TYPES,
  REFERENCE_TYPES,
} = require("./ledgers.cjs");
const { updateOutstandingBalance } = require("./customers.cjs");

/**
 * Get device ID
 */
function getDeviceId() {
  return getDeviceIdFromDB();
}

/**
 * Get current timestamp
 */
function getCurrentTimestamp() {
  return getCurrentTimestampFromDB();
}

/**
 * Generate invoice number (format: INV-YYYYMMDD-001)
 */
function generateInvoiceNumber() {
  const db = getDatabase();
  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const prefix = `INV-${today}-`;

  const lastInvoice = db
    .prepare(
      `
    SELECT invoice_number FROM invoices
    WHERE invoice_number LIKE ?
    ORDER BY invoice_number DESC
    LIMIT 1
  `
    )
    .get(`${prefix}%`);

  if (!lastInvoice) {
    return `${prefix}001`;
  }

  const lastNumber = parseInt(lastInvoice.invoice_number.slice(-3), 10);
  const nextNumber = String(lastNumber + 1).padStart(3, "0");
  return `${prefix}${nextNumber}`;
}

/**
 * Generate estimate number (format: EST-YYYYMMDD-001)
 */
function generateEstimateNumber() {
  const db = getDatabase();
  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const prefix = `EST-${today}-`;

  const lastEstimate = db
    .prepare(
      `
    SELECT estimate_number FROM estimates
    WHERE estimate_number LIKE ?
    ORDER BY estimate_number DESC
    LIMIT 1
  `
    )
    .get(`${prefix}%`);

  if (!lastEstimate) {
    return `${prefix}001`;
  }

  const lastNumber = parseInt(lastEstimate.estimate_number.slice(-3), 10);
  const nextNumber = String(lastNumber + 1).padStart(3, "0");
  return `${prefix}${nextNumber}`;
}

/**
 * Generate challan number (format: CHL-YYYYMMDD-001)
 */
function generateChallanNumber() {
  const db = getDatabase();
  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const prefix = `CHL-${today}-`;

  const lastChallan = db
    .prepare(
      `
    SELECT challan_number FROM delivery_challans
    WHERE challan_number LIKE ?
    ORDER BY challan_number DESC
    LIMIT 1
  `
    )
    .get(`${prefix}%`);

  if (!lastChallan) {
    return `${prefix}001`;
  }

  const lastNumber = parseInt(lastChallan.challan_number.slice(-3), 10);
  const nextNumber = String(lastNumber + 1).padStart(3, "0");
  return `${prefix}${nextNumber}`;
}

/**
 * Calculate invoice totals with Pakistani taxes
 * Tax rates: Sales Tax (17%), PST (varies), WHT (varies)
 */
function calculateInvoiceTotals(
  items,
  discountAmount = 0,
  discountPercent = 0
) {
  let subtotal = 0;
  let totalTaxAmount = 0;

  // Calculate line totals
  for (const item of items) {
    const lineSubtotal = item.quantity * item.unit_price;
    const lineDiscount = item.discount_amount || 0;
    const lineAfterDiscount = lineSubtotal - lineDiscount;

    // Calculate tax (Sales Tax 17% is standard, PST and WHT are additional)
    const salesTaxRate = item.tax_rate || 17; // Default 17% Sales Tax
    const lineTaxAmount = (lineAfterDiscount * salesTaxRate) / 100;

    item.tax_amount = lineTaxAmount;
    item.line_total = lineAfterDiscount + lineTaxAmount;

    subtotal += lineAfterDiscount;
    totalTaxAmount += lineTaxAmount;
  }

  // Apply invoice-level discount
  let finalSubtotal = subtotal;
  if (discountPercent > 0) {
    discountAmount = (subtotal * discountPercent) / 100;
  }
  finalSubtotal = subtotal - discountAmount;

  // Recalculate tax on discounted amount if needed
  // For simplicity, we'll keep the line-item tax calculation
  const totalAmount = finalSubtotal + totalTaxAmount;

  return {
    subtotal: finalSubtotal,
    discount_amount: discountAmount,
    discount_percent: discountPercent,
    tax_amount: totalTaxAmount,
    total_amount: totalAmount,
  };
}

/**
 * Create invoice
 */
function createInvoice(invoiceData) {
  const db = getDatabase();
  const deviceId = getDeviceId();
  const now = getCurrentTimestamp();

  const invoiceId = uuidv4();
  const invoiceNumber = invoiceData.invoice_number || generateInvoiceNumber();

  // Create a copy of items to avoid mutating the original
  const itemsCopy = (invoiceData.items || []).map((item) => ({ ...item }));

  // Calculate totals (this modifies itemsCopy in place to add tax_amount and line_total)
  const totals = calculateInvoiceTotals(
    itemsCopy,
    invoiceData.discount_amount || 0,
    invoiceData.discount_percent || 0
  );

  // Insert invoice
  db.prepare(
    `
    INSERT INTO invoices (
      id, invoice_number, invoice_type, customer_id, date, due_date,
      subtotal, discount_amount, discount_percent, tax_amount, total_amount,
      status, payment_terms, notes, reference_number,
      created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    invoiceId,
    invoiceNumber,
    invoiceData.invoice_type || "TAX_INVOICE",
    invoiceData.customer_id,
    invoiceData.date || now,
    invoiceData.due_date || null,
    totals.subtotal,
    totals.discount_amount,
    totals.discount_percent,
    totals.tax_amount,
    totals.total_amount,
    invoiceData.status || "DRAFT",
    invoiceData.payment_terms || null,
    invoiceData.notes || null,
    invoiceData.reference_number || null,
    now,
    now,
    "PENDING",
    deviceId
  );

  // Insert invoice items (use itemsCopy which now has calculated tax_amount and line_total)
  if (itemsCopy && itemsCopy.length > 0) {
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (
        id, invoice_id, item_id, variant_id, description, quantity,
        unit_price, discount_amount, tax_rate, tax_amount, line_total,
        serial_number, created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItems = db.transaction((items) => {
      for (const item of items) {
        const itemId = uuidv4();
        insertItem.run(
          itemId,
          invoiceId,
          item.item_id || null,
          item.variant_id || null,
          item.description,
          item.quantity,
          item.unit_price,
          item.discount_amount || 0,
          item.tax_rate || 17,
          item.tax_amount || 0, // This should now be calculated by calculateInvoiceTotals
          item.line_total || 0, // This should now be calculated by calculateInvoiceTotals
          item.serial_number || null,
          now,
          now,
          "PENDING",
          deviceId
        );
      }
    });

    insertItems(itemsCopy);
  }

  // Create ledger entry for invoice (debit to customer account)
  // Only create if invoice status is not DRAFT (DRAFT invoices don't create receivables)
  if (invoiceData.customer_id && invoiceData.status !== "DRAFT") {
    const customer = db
      .prepare("SELECT name FROM customers WHERE id = ?")
      .get(invoiceData.customer_id);
    const customerName = customer ? customer.name : "Customer";

    createLedgerEntry({
      entryType: ENTRY_TYPES.INVOICE_CREATED,
      referenceType: REFERENCE_TYPES.INVOICE,
      referenceId: invoiceId,
      customerId: invoiceData.customer_id,
      description: `Invoice ${invoiceNumber} for ${customerName}`,
      debit: totals.total_amount,
      credit: 0,
      date: invoiceData.date || now,
    });

    // Update customer outstanding balance
    updateOutstandingBalance(invoiceData.customer_id);
  }

  return getInvoice(invoiceId);
}

/**
 * Get invoice by ID
 */
function getInvoice(invoiceId) {
  const db = getDatabase();

  const invoice = db
    .prepare(
      `
    SELECT 
      i.*,
      c.name as customer_name,
      c.phone as customer_phone,
      c.address as customer_address
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    WHERE i.id = ?
  `
    )
    .get(invoiceId);

  if (!invoice) {
    return null;
  }

  const items = db
    .prepare(
      `
    SELECT * FROM invoice_items WHERE invoice_id = ?
    ORDER BY created_at ASC
  `
    )
    .all(invoiceId);

  // Transform to match TypeScript interface
  const transformedItems = items.map((item) => ({
    id: item.id,
    invoiceId: item.invoice_id,
    itemId: item.item_id || null,
    variantId: item.variant_id || null,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    discountAmount: item.discount_amount,
    taxRate: item.tax_rate,
    taxAmount: item.tax_amount,
    lineTotal: item.line_total,
    serialNumber: item.serial_number || null,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    syncStatus: item.sync_status,
    deviceId: item.device_id,
  }));

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    invoiceType: invoice.invoice_type,
    customerId: invoice.customer_id,
    customerName: invoice.customer_name || null,
    customerPhone: invoice.customer_phone || null,
    customerAddress: invoice.customer_address || null,
    date: invoice.date,
    dueDate: invoice.due_date || null,
    subtotal: invoice.subtotal,
    discountAmount: invoice.discount_amount,
    discountPercent: invoice.discount_percent,
    taxAmount: invoice.tax_amount,
    totalAmount: invoice.total_amount,
    status: invoice.status,
    paymentTerms: invoice.payment_terms || null,
    notes: invoice.notes || null,
    referenceNumber: invoice.reference_number || null,
    createdAt: invoice.created_at,
    updatedAt: invoice.updated_at,
    syncStatus: invoice.sync_status,
    deviceId: invoice.device_id,
    items: transformedItems,
  };
}

/**
 * Get all invoices with filters
 */
function getInvoices(filters = {}) {
  const db = getDatabase();

  let query = `
    SELECT 
      i.*,
      c.name as customer_name
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.customer_id) {
    query += " AND i.customer_id = ?";
    params.push(filters.customer_id);
  }

  if (filters.status) {
    query += " AND i.status = ?";
    params.push(filters.status);
  }

  if (filters.date_from) {
    query += " AND i.date >= ?";
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    query += " AND i.date <= ?";
    params.push(filters.date_to);
  }

  query += " ORDER BY i.date DESC, i.created_at DESC";

  const invoices = db.prepare(query).all(...params);

  // Transform to match TypeScript interface
  const transformedInvoices = invoices.map((invoice) => ({
    id: invoice.id || "",
    invoiceNumber: invoice.invoice_number || "",
    invoiceType: invoice.invoice_type || "TAX_INVOICE",
    customerId: invoice.customer_id || "",
    customerName: invoice.customer_name || null,
    date: invoice.date || new Date().toISOString().split("T")[0],
    dueDate: invoice.due_date || null,
    subtotal: invoice.subtotal || 0,
    discountAmount: invoice.discount_amount || 0,
    discountPercent: invoice.discount_percent || 0,
    taxAmount: invoice.tax_amount || 0,
    totalAmount: invoice.total_amount || 0,
    status: invoice.status || "DRAFT",
    paymentTerms: invoice.payment_terms || null,
    notes: invoice.notes || null,
    referenceNumber: invoice.reference_number || null,
    createdAt: invoice.created_at || new Date().toISOString(),
    updatedAt: invoice.updated_at || new Date().toISOString(),
    syncStatus: invoice.sync_status || "PENDING",
    deviceId: invoice.device_id || "",
  }));

  // Optionally load items for each invoice
  if (filters.include_items) {
    const getItems = db.prepare(
      "SELECT * FROM invoice_items WHERE invoice_id = ?"
    );
    return transformedInvoices.map((invoice) => ({
      ...invoice,
      items: getItems.all(invoice.id),
    }));
  }

  return transformedInvoices;
}

/**
 * Update invoice status
 */
function updateInvoiceStatus(invoiceId, status) {
  const db = getDatabase();
  const now = getCurrentTimestamp();

  // Get invoice before update
  const invoice = db
    .prepare("SELECT * FROM invoices WHERE id = ?")
    .get(invoiceId);
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  // If status is changing from DRAFT to SENT/PARTIAL/OVERDUE, create ledger entry
  if (
    invoice.status === "DRAFT" &&
    ["SENT", "PARTIAL", "OVERDUE"].includes(status)
  ) {
    const customer = db
      .prepare("SELECT name FROM customers WHERE id = ?")
      .get(invoice.customer_id);
    const customerName = customer ? customer.name : "Customer";

    // Check if ledger entry already exists
    const existingEntry = db
      .prepare(
        `
      SELECT id FROM ledger_entries 
      WHERE reference_type = ? AND reference_id = ?
    `
      )
      .get(REFERENCE_TYPES.INVOICE, invoiceId);

    if (!existingEntry) {
      createLedgerEntry({
        entryType: ENTRY_TYPES.INVOICE_CREATED,
        referenceType: REFERENCE_TYPES.INVOICE,
        referenceId: invoiceId,
        customerId: invoice.customer_id,
        description: `Invoice ${invoice.invoice_number} for ${customerName}`,
        debit: invoice.total_amount,
        credit: 0,
        date: invoice.date,
      });

      // Update customer outstanding balance
      updateOutstandingBalance(invoice.customer_id);
    }
  }

  db.prepare(
    `
    UPDATE invoices
    SET status = ?, updated_at = ?, sync_status = 'PENDING'
    WHERE id = ?
  `
  ).run(status, now, invoiceId);

  return getInvoice(invoiceId);
}

/**
 * Create estimate
 */
function createEstimate(estimateData) {
  const db = getDatabase();
  const deviceId = getDeviceId();
  const now = getCurrentTimestamp();

  const estimateId = uuidv4();
  const estimateNumber =
    estimateData.estimate_number || generateEstimateNumber();

  // Calculate totals
  const totals = calculateInvoiceTotals(
    estimateData.items || [],
    estimateData.discount_amount || 0,
    0 // Estimates typically don't have percentage discounts
  );

  // Insert estimate
  db.prepare(
    `
    INSERT INTO estimates (
      id, estimate_number, customer_id, date, valid_until,
      subtotal, discount_amount, tax_amount, total_amount,
      status, notes, created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    estimateId,
    estimateNumber,
    estimateData.customer_id,
    estimateData.date || now,
    estimateData.valid_until || null,
    totals.subtotal,
    totals.discount_amount,
    totals.tax_amount,
    totals.total_amount,
    estimateData.status || "DRAFT",
    estimateData.notes || null,
    now,
    now,
    "PENDING",
    deviceId
  );

  // Insert estimate items
  if (estimateData.items && estimateData.items.length > 0) {
    const insertItem = db.prepare(`
      INSERT INTO estimate_items (
        id, estimate_id, item_id, variant_id, description, quantity,
        unit_price, discount_amount, tax_rate, tax_amount, line_total,
        created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItems = db.transaction((items) => {
      for (const item of items) {
        const itemId = uuidv4();
        insertItem.run(
          itemId,
          estimateId,
          item.item_id || null,
          item.variant_id || null,
          item.description,
          item.quantity,
          item.unit_price,
          item.discount_amount || 0,
          item.tax_rate || 17,
          item.tax_amount || 0,
          item.line_total || 0,
          now,
          now,
          "PENDING",
          deviceId
        );
      }
    });

    insertItems(estimateData.items);
  }

  return getEstimate(estimateId);
}

/**
 * Get estimate by ID
 */
function getEstimate(estimateId) {
  const db = getDatabase();

  const estimate = db
    .prepare(
      `
    SELECT 
      e.*,
      c.name as customer_name
    FROM estimates e
    LEFT JOIN customers c ON e.customer_id = c.id
    WHERE e.id = ?
  `
    )
    .get(estimateId);

  if (!estimate) {
    return null;
  }

  const items = db
    .prepare(
      `
    SELECT * FROM estimate_items WHERE estimate_id = ?
    ORDER BY created_at ASC
  `
    )
    .all(estimateId);

  // Transform to match TypeScript interface
  return {
    id: estimate.id,
    estimateNumber: estimate.estimate_number,
    customerId: estimate.customer_id,
    customerName: estimate.customer_name,
    date: estimate.date,
    validUntil: estimate.valid_until,
    subtotal: estimate.subtotal,
    discountAmount: estimate.discount_amount,
    taxAmount: estimate.tax_amount,
    totalAmount: estimate.total_amount,
    status: estimate.status,
    notes: estimate.notes,
    createdAt: estimate.created_at,
    updatedAt: estimate.updated_at,
    syncStatus: estimate.sync_status,
    deviceId: estimate.device_id,
    items: items.map((item) => ({
      id: item.id,
      estimateId: item.estimate_id,
      itemId: item.item_id,
      variantId: item.variant_id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      discountAmount: item.discount_amount,
      taxRate: item.tax_rate,
      taxAmount: item.tax_amount,
      lineTotal: item.line_total,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      syncStatus: item.sync_status,
      deviceId: item.device_id,
    })),
  };
}

/**
 * Get all estimates
 */
function getEstimates(filters = {}) {
  const db = getDatabase();

  let query = `
    SELECT 
      e.*,
      c.name as customer_name
    FROM estimates e
    LEFT JOIN customers c ON e.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.customer_id) {
    query += " AND e.customer_id = ?";
    params.push(filters.customer_id);
  }

  if (filters.status) {
    query += " AND e.status = ?";
    params.push(filters.status);
  }

  query += " ORDER BY e.date DESC, e.created_at DESC";

  const estimates = db.prepare(query).all(...params);

  // Transform to match TypeScript interface
  return estimates.map((estimate) => ({
    id: estimate.id,
    estimateNumber: estimate.estimate_number,
    customerId: estimate.customer_id,
    customerName: estimate.customer_name,
    date: estimate.date,
    validUntil: estimate.valid_until,
    subtotal: estimate.subtotal,
    discountAmount: estimate.discount_amount,
    taxAmount: estimate.tax_amount,
    totalAmount: estimate.total_amount,
    status: estimate.status,
    notes: estimate.notes,
    createdAt: estimate.created_at,
    updatedAt: estimate.updated_at,
    syncStatus: estimate.sync_status,
    deviceId: estimate.device_id,
  }));
}

/**
 * Convert estimate to invoice
 */
function convertEstimateToInvoice(estimateId) {
  const estimate = getEstimate(estimateId);
  if (!estimate) {
    throw new Error("Estimate not found");
  }

  if (estimate.status === "CONVERTED") {
    throw new Error("Estimate already converted");
  }

  const invoiceData = {
    invoice_type: "TAX_INVOICE",
    customer_id: estimate.customerId || estimate.customer_id,
    date: new Date().toISOString().split("T")[0],
    items: estimate.items.map((item) => ({
      item_id: item.itemId || item.item_id,
      variant_id: item.variantId || item.variant_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice || item.unit_price,
      discount_amount: item.discountAmount || item.discount_amount || 0,
      tax_rate: item.taxRate || item.tax_rate || 17,
    })),
    discount_amount: estimate.discountAmount || estimate.discount_amount || 0,
    notes: estimate.notes,
    reference_number: estimate.estimateNumber || estimate.estimate_number,
  };

  if (!invoiceData.customer_id) {
    throw new Error("Estimate has no customer_id");
  }

  const invoice = createInvoice(invoiceData);

  // Update estimate status
  const db = getDatabase();
  const now = getCurrentTimestamp();
  db.prepare(
    `
    UPDATE estimates
    SET status = 'CONVERTED', updated_at = ?, sync_status = 'PENDING'
    WHERE id = ?
  `
  ).run(now, estimateId);

  return invoice;
}

/**
 * Create delivery challan
 */
function createChallan(challanData) {
  const db = getDatabase();
  const deviceId = getDeviceId();
  const now = getCurrentTimestamp();

  const challanId = uuidv4();
  const challanNumber = challanData.challan_number || generateChallanNumber();

  // Insert challan
  db.prepare(
    `
    INSERT INTO delivery_challans (
      id, challan_number, customer_id, date, invoice_id,
      status, notes, created_at, updated_at, sync_status, device_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    challanId,
    challanNumber,
    challanData.customer_id,
    challanData.date || now,
    challanData.invoice_id || null,
    challanData.status || "DRAFT",
    challanData.notes || null,
    now,
    now,
    "PENDING",
    deviceId
  );

  // Insert challan items
  if (challanData.items && challanData.items.length > 0) {
    const insertItem = db.prepare(`
      INSERT INTO challan_items (
        id, challan_id, item_id, variant_id, description, quantity,
        unit_price, created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItems = db.transaction((items) => {
      for (const item of items) {
        const itemId = uuidv4();
        insertItem.run(
          itemId,
          challanId,
          item.item_id || null,
          item.variant_id || null,
          item.description,
          item.quantity,
          item.unit_price || 0,
          now,
          now,
          "PENDING",
          deviceId
        );
      }
    });

    insertItems(challanData.items);
  }

  return getChallan(challanId);
}

/**
 * Get challan by ID
 */
function getChallan(challanId) {
  const db = getDatabase();

  const challan = db
    .prepare(
      `
    SELECT 
      dc.*,
      c.name as customer_name
    FROM delivery_challans dc
    LEFT JOIN customers c ON dc.customer_id = c.id
    WHERE dc.id = ?
  `
    )
    .get(challanId);

  if (!challan) {
    return null;
  }

  const items = db
    .prepare(
      `
    SELECT * FROM challan_items WHERE challan_id = ?
    ORDER BY created_at ASC
  `
    )
    .all(challanId);

  // Transform to match TypeScript interface
  return {
    id: challan.id,
    challanNumber: challan.challan_number,
    customerId: challan.customer_id,
    customerName: challan.customer_name,
    date: challan.date,
    invoiceId: challan.invoice_id,
    status: challan.status,
    notes: challan.notes,
    createdAt: challan.created_at,
    updatedAt: challan.updated_at,
    syncStatus: challan.sync_status,
    deviceId: challan.device_id,
    items: items.map((item) => ({
      id: item.id,
      challanId: item.challan_id,
      itemId: item.item_id,
      variantId: item.variant_id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      syncStatus: item.sync_status,
      deviceId: item.device_id,
    })),
  };
}

/**
 * Get all challans
 */
function getChallans(filters = {}) {
  const db = getDatabase();

  let query = `
    SELECT 
      dc.*,
      c.name as customer_name
    FROM delivery_challans dc
    LEFT JOIN customers c ON dc.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.customer_id) {
    query += " AND dc.customer_id = ?";
    params.push(filters.customer_id);
  }

  if (filters.status) {
    query += " AND dc.status = ?";
    params.push(filters.status);
  }

  query += " ORDER BY dc.date DESC, dc.created_at DESC";

  const challans = db.prepare(query).all(...params);

  // Transform to match TypeScript interface
  return challans.map((challan) => ({
    id: challan.id,
    challanNumber: challan.challan_number,
    customerId: challan.customer_id,
    customerName: challan.customer_name,
    date: challan.date,
    invoiceId: challan.invoice_id,
    status: challan.status,
    notes: challan.notes,
    createdAt: challan.created_at,
    updatedAt: challan.updated_at,
    syncStatus: challan.sync_status,
    deviceId: challan.device_id,
  }));
}

/**
 * Convert challan to invoice
 */
function convertChallanToInvoice(challanId) {
  const challan = getChallan(challanId);
  if (!challan) {
    throw new Error("Challan not found");
  }

  if (challan.status === "CONVERTED") {
    throw new Error("Challan already converted");
  }

  const invoiceData = {
    invoice_type: "TAX_INVOICE",
    customer_id: challan.customerId || challan.customer_id,
    date: new Date().toISOString().split("T")[0],
    items: challan.items.map((item) => ({
      item_id: item.itemId || item.item_id,
      variant_id: item.variantId || item.variant_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice || item.unit_price || 0,
      discount_amount: 0,
      tax_rate: 17, // Default tax rate
    })),
    notes: challan.notes,
    reference_number: challan.challanNumber || challan.challan_number,
  };

  if (!invoiceData.customer_id) {
    throw new Error("Challan has no customer_id");
  }

  const invoice = createInvoice(invoiceData);

  // Update challan status
  const db = getDatabase();
  const now = getCurrentTimestamp();
  db.prepare(
    `
    UPDATE delivery_challans
    SET status = 'CONVERTED', invoice_id = ?, updated_at = ?, sync_status = 'PENDING'
    WHERE id = ?
  `
  ).run(invoice.id, now, challanId);

  return invoice;
}

/**
 * Get company settings
 */
function getCompanySettings() {
  const db = getDatabase();

  const settings = db
    .prepare(
      `
    SELECT * FROM company_settings
    ORDER BY created_at DESC
    LIMIT 1
  `
    )
    .get();

  if (!settings) {
    // Return default empty settings
    return {
      id: "",
      companyName: "",
      logoUrl: null,
      address: null,
      phone: null,
      email: null,
      website: null,
      taxId: null,
      salesTaxRegistration: null,
      signatureUrl: null,
      brandColorPrimary: null,
      brandColorSecondary: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: "PENDING",
      deviceId: getDeviceId(),
    };
  }

  // Transform to match TypeScript interface
  return {
    id: settings.id,
    companyName: settings.company_name,
    logoUrl: settings.logo_url,
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
    website: settings.website,
    taxId: settings.tax_id,
    salesTaxRegistration: settings.sales_tax_registration,
    signatureUrl: settings.signature_url,
    brandColorPrimary: settings.brand_color_primary,
    brandColorSecondary: settings.brand_color_secondary,
    createdAt: settings.created_at,
    updatedAt: settings.updated_at,
    syncStatus: settings.sync_status,
    deviceId: settings.device_id,
  };
}

/**
 * Update company settings
 */
function updateCompanySettings(settingsData) {
  const db = getDatabase();
  const deviceId = getDeviceId();
  const now = getCurrentTimestamp();

  // Check if settings exist
  const existing = db.prepare("SELECT id FROM company_settings LIMIT 1").get();

  if (existing) {
    // Update existing settings
    db.prepare(
      `
      UPDATE company_settings
      SET company_name = ?,
          logo_url = ?,
          address = ?,
          phone = ?,
          email = ?,
          website = ?,
          tax_id = ?,
          sales_tax_registration = ?,
          signature_url = ?,
          brand_color_primary = ?,
          brand_color_secondary = ?,
          updated_at = ?,
          sync_status = 'PENDING'
      WHERE id = ?
    `
    ).run(
      settingsData.company_name || settingsData.companyName || "",
      settingsData.logo_url || settingsData.logoUrl || null,
      settingsData.address || null,
      settingsData.phone || null,
      settingsData.email || null,
      settingsData.website || null,
      settingsData.tax_id || settingsData.taxId || null,
      settingsData.sales_tax_registration ||
        settingsData.salesTaxRegistration ||
        null,
      settingsData.signature_url || settingsData.signatureUrl || null,
      settingsData.brand_color_primary ||
        settingsData.brandColorPrimary ||
        null,
      settingsData.brand_color_secondary ||
        settingsData.brandColorSecondary ||
        null,
      now,
      existing.id
    );

    return getCompanySettings();
  } else {
    // Create new settings
    const settingsId = uuidv4();

    db.prepare(
      `
      INSERT INTO company_settings (
        id, company_name, logo_url, address, phone, email, website,
        tax_id, sales_tax_registration, signature_url,
        brand_color_primary, brand_color_secondary,
        created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      settingsId,
      settingsData.company_name || settingsData.companyName || "",
      settingsData.logo_url || settingsData.logoUrl || null,
      settingsData.address || null,
      settingsData.phone || null,
      settingsData.email || null,
      settingsData.website || null,
      settingsData.tax_id || settingsData.taxId || null,
      settingsData.sales_tax_registration ||
        settingsData.salesTaxRegistration ||
        null,
      settingsData.signature_url || settingsData.signatureUrl || null,
      settingsData.brand_color_primary ||
        settingsData.brandColorPrimary ||
        null,
      settingsData.brand_color_secondary ||
        settingsData.brandColorSecondary ||
        null,
      now,
      now,
      "PENDING",
      deviceId
    );

    return getCompanySettings();
  }
}

module.exports = {
  createInvoice,
  getInvoice,
  getInvoices,
  updateInvoiceStatus,
  generateInvoiceNumber,
  calculateInvoiceTotals,
  createEstimate,
  getEstimate,
  getEstimates,
  convertEstimateToInvoice,
  createChallan,
  getChallan,
  getChallans,
  convertChallanToInvoice,
  getCompanySettings,
  updateCompanySettings,
};
