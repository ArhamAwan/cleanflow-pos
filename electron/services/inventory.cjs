const { v4: uuidv4 } = require('uuid');
const { getDatabase, getDeviceId, getCurrentTimestamp } = require('../db/database.cjs');
const { withTransaction } = require('../db/transaction.cjs');

/**
 * Inventory Service
 * Handles all inventory operations: items, variants, stock management, warehouses
 */

/**
 * Create a new item/product
 */
function createItem(itemData, userId = null) {
  return withTransaction((db) => {
    const deviceId = getDeviceId();
    const now = getCurrentTimestamp();
    const id = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO items (
        id, name, sku, barcode, category, unit,
        purchase_price, selling_price, tax_rate,
        is_active, image_url, description,
        created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `);
    
    stmt.run(
      id,
      itemData.name,
      itemData.sku || null,
      itemData.barcode || null,
      itemData.category || null,
      itemData.unit || 'piece',
      itemData.purchasePrice || 0,
      itemData.sellingPrice || 0,
      itemData.taxRate || 17,
      itemData.isActive !== undefined ? (itemData.isActive ? 1 : 0) : 1,
      itemData.imageUrl || null,
      itemData.description || null,
      now,
      now,
      deviceId
    );
    
    return getItemById(id);
  });
}

/**
 * Update an existing item
 */
function updateItem(itemId, itemData, userId = null) {
  return withTransaction((db) => {
    const now = getCurrentTimestamp();
    
    const updates = [];
    const values = [];
    
    if (itemData.name !== undefined) {
      updates.push('name = ?');
      values.push(itemData.name);
    }
    if (itemData.sku !== undefined) {
      updates.push('sku = ?');
      values.push(itemData.sku);
    }
    if (itemData.barcode !== undefined) {
      updates.push('barcode = ?');
      values.push(itemData.barcode);
    }
    if (itemData.category !== undefined) {
      updates.push('category = ?');
      values.push(itemData.category);
    }
    if (itemData.unit !== undefined) {
      updates.push('unit = ?');
      values.push(itemData.unit);
    }
    if (itemData.purchasePrice !== undefined) {
      updates.push('purchase_price = ?');
      values.push(itemData.purchasePrice);
    }
    if (itemData.sellingPrice !== undefined) {
      updates.push('selling_price = ?');
      values.push(itemData.sellingPrice);
    }
    if (itemData.taxRate !== undefined) {
      updates.push('tax_rate = ?');
      values.push(itemData.taxRate);
    }
    if (itemData.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(itemData.isActive ? 1 : 0);
    }
    if (itemData.imageUrl !== undefined) {
      updates.push('image_url = ?');
      values.push(itemData.imageUrl);
    }
    if (itemData.description !== undefined) {
      updates.push('description = ?');
      values.push(itemData.description);
    }
    
    if (updates.length === 0) {
      return getItemById(itemId);
    }
    
    updates.push('updated_at = ?');
    updates.push("sync_status = 'PENDING'");
    values.push(now);
    values.push(itemId);
    
    db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    
    return getItemById(itemId);
  });
}

/**
 * Get all items with optional filters
 */
function getItems(filters = {}) {
  const db = getDatabase();
  let query = 'SELECT * FROM items WHERE 1=1';
  const params = [];
  
  if (filters.search) {
    query += ' AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  if (filters.category) {
    query += ' AND category = ?';
    params.push(filters.category);
  }
  
  if (filters.isActive !== undefined) {
    query += ' AND is_active = ?';
    params.push(filters.isActive ? 1 : 0);
  }
  
  query += ' ORDER BY name ASC';
  
  const items = db.prepare(query).all(...params);
  
  // Transform to match TypeScript interface
  return items.map(item => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    category: item.category,
    unit: item.unit,
    purchasePrice: item.purchase_price,
    sellingPrice: item.selling_price,
    taxRate: item.tax_rate,
    isActive: item.is_active === 1,
    imageUrl: item.image_url,
    description: item.description,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    syncStatus: item.sync_status,
    deviceId: item.device_id,
  }));
}

/**
 * Get item by ID
 */
function getItemById(itemId) {
  const db = getDatabase();
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  
  if (!item) return null;
  
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    category: item.category,
    unit: item.unit,
    purchasePrice: item.purchase_price,
    sellingPrice: item.selling_price,
    taxRate: item.tax_rate,
    isActive: item.is_active === 1,
    imageUrl: item.image_url,
    description: item.description,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    syncStatus: item.sync_status,
    deviceId: item.device_id,
  };
}

/**
 * Get item by barcode
 */
function getItemByBarcode(barcode) {
  const db = getDatabase();
  const item = db.prepare('SELECT * FROM items WHERE barcode = ?').get(barcode);
  
  if (!item) return null;
  
  return {
    type: 'item',
    data: {
      id: item.id,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      category: item.category,
      unit: item.unit,
      purchasePrice: item.purchase_price,
      sellingPrice: item.selling_price,
      taxRate: item.tax_rate,
      isActive: item.is_active === 1,
      imageUrl: item.image_url,
      description: item.description,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      syncStatus: item.sync_status,
      deviceId: item.device_id,
    },
  };
}

/**
 * Add stock to an item
 */
function addStock(itemId, variantId, warehouseId, quantity, transaction = {}) {
  return withTransaction((db) => {
    const deviceId = getDeviceId();
    const now = getCurrentTimestamp();
    const stockKey = variantId || '';
    const unitCost = transaction.unitCost || null;
    
    // Get or create stock level
    const existingStock = db.prepare(`
      SELECT * FROM stock_levels
      WHERE item_id = ? AND variant_id = ? AND warehouse_id = ?
    `).get(itemId, stockKey, warehouseId);
    
    if (existingStock) {
      db.prepare(`
        UPDATE stock_levels
        SET quantity = quantity + ?,
            last_updated = ?
        WHERE item_id = ? AND variant_id = ? AND warehouse_id = ?
      `).run(quantity, now, itemId, stockKey, warehouseId);
    } else {
      db.prepare(`
        INSERT INTO stock_levels (
          item_id, variant_id, warehouse_id,
          quantity, reserved_quantity, low_stock_threshold, reorder_quantity, last_updated
        )
        VALUES (?, ?, ?, ?, 0, 0, 0, ?)
      `).run(itemId, stockKey, warehouseId, quantity, now);
    }
    
    // Create stock transaction
    const txnId = uuidv4();
    db.prepare(`
      INSERT INTO stock_transactions (
        id, item_id, variant_id, warehouse_id, transaction_type,
        quantity, unit_cost, reference_type, reference_id, notes,
        created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, 'PURCHASE', ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `).run(
      txnId,
      itemId,
      stockKey,
      warehouseId,
      quantity,
      unitCost,
      transaction.referenceType || 'adjustment',
      transaction.referenceId || null,
      transaction.notes || null,
      now,
      now,
      deviceId
    );
    
    return { success: true, transactionId: txnId };
  });
}

/**
 * Remove stock from an item
 */
function removeStock(itemId, variantId, warehouseId, quantity, transaction = {}) {
  return withTransaction((db) => {
    const deviceId = getDeviceId();
    const now = getCurrentTimestamp();
    const stockKey = variantId || '';
    
    // Check available stock
    const stock = db.prepare(`
      SELECT quantity, reserved_quantity FROM stock_levels
      WHERE item_id = ? AND variant_id = ? AND warehouse_id = ?
    `).get(itemId, stockKey, warehouseId);
    
    if (!stock || stock.quantity < quantity) {
      throw new Error('Insufficient stock');
    }
    
    // Update stock level
    db.prepare(`
      UPDATE stock_levels
      SET quantity = quantity - ?,
          last_updated = ?
      WHERE item_id = ? AND variant_id = ? AND warehouse_id = ?
    `).run(quantity, now, itemId, stockKey, warehouseId);
    
    // Create stock transaction
    const txnId = uuidv4();
    db.prepare(`
      INSERT INTO stock_transactions (
        id, item_id, variant_id, warehouse_id, transaction_type,
        quantity, reference_type, reference_id, notes,
        created_at, updated_at, sync_status, device_id
      )
      VALUES (?, ?, ?, ?, 'SALE', ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `).run(
      txnId,
      itemId,
      stockKey,
      warehouseId,
      -quantity,
      transaction.referenceType || 'adjustment',
      transaction.referenceId || null,
      transaction.notes || null,
      now,
      now,
      deviceId
    );
    
    return { success: true, transactionId: txnId };
  });
}

/**
 * Transfer stock between warehouses
 */
function transferStock(itemId, variantId, fromWarehouseId, toWarehouseId, quantity, notes) {
  return withTransaction((db) => {
    const deviceId = getDeviceId();
    const now = getCurrentTimestamp();
    const stockKey = variantId || '';
    
    // Remove from source warehouse
    removeStock(itemId, variantId, fromWarehouseId, quantity, {
      referenceType: 'transfer',
      notes: `Transfer to warehouse ${toWarehouseId}: ${notes || ''}`,
    });
    
    // Add to destination warehouse
    addStock(itemId, variantId, toWarehouseId, quantity, {
      referenceType: 'transfer',
      notes: `Transfer from warehouse ${fromWarehouseId}: ${notes || ''}`,
    });
    
    return { success: true };
  });
}

/**
 * Get stock levels for an item
 */
function getStockLevels(itemId, warehouseId = null) {
  const db = getDatabase();
  let query = 'SELECT * FROM stock_levels WHERE item_id = ?';
  const params = [itemId];
  
  if (warehouseId) {
    query += ' AND warehouse_id = ?';
    params.push(warehouseId);
  }
  
  const levels = db.prepare(query).all(...params);
  
  return levels.map(level => ({
    itemId: level.item_id,
    variantId: level.variant_id || undefined,
    warehouseId: level.warehouse_id,
    quantity: level.quantity,
    reservedQuantity: level.reserved_quantity,
    lowStockThreshold: level.low_stock_threshold,
    reorderQuantity: level.reorder_quantity || 0,
    lastUpdated: level.last_updated,
  }));
}

/**
 * Check stock availability
 */
function checkStockAvailability(itemId, variantId, warehouseId, quantity) {
  const db = getDatabase();
  const stockKey = variantId || '';
  
  const stock = db.prepare(`
    SELECT quantity, reserved_quantity FROM stock_levels
    WHERE item_id = ? AND variant_id = ? AND warehouse_id = ?
  `).get(itemId, stockKey, warehouseId);
  
  if (!stock) {
    return { available: 0, reserved: 0, total: 0 };
  }
  
  const available = stock.quantity - stock.reserved_quantity;
  
  return {
    available: Math.max(0, available),
    reserved: stock.reserved_quantity,
    total: stock.quantity,
  };
}

/**
 * Get low stock items
 */
function getLowStockItems(warehouseId = null) {
  const db = getDatabase();
  let query = `
    SELECT sl.*, i.name as item_name, i.sku as item_sku, w.name as warehouse_name
    FROM stock_levels sl
    JOIN items i ON sl.item_id = i.id
    JOIN warehouses w ON sl.warehouse_id = w.id
    WHERE sl.quantity <= sl.low_stock_threshold
    AND sl.low_stock_threshold > 0
  `;
  const params = [];
  
  if (warehouseId) {
    query += ' AND sl.warehouse_id = ?';
    params.push(warehouseId);
  }
  
  query += ' ORDER BY sl.quantity ASC';
  
  const alerts = db.prepare(query).all(...params);
  
  return alerts.map(alert => ({
    id: `${alert.item_id}-${alert.variant_id || ''}-${alert.warehouse_id}`,
    itemId: alert.item_id,
    variantId: alert.variant_id || undefined,
    warehouseId: alert.warehouse_id,
    currentQuantity: alert.quantity,
    threshold: alert.low_stock_threshold,
    reorderQuantity: alert.reorder_quantity || 0,
    itemName: alert.item_name,
    itemSku: alert.item_sku,
    warehouseName: alert.warehouse_name,
    isResolved: false,
    createdAt: alert.last_updated,
    updatedAt: alert.last_updated,
  }));
}

/**
 * Update low stock threshold
 */
function updateLowStockThreshold(itemId, variantId, warehouseId, threshold) {
  return withTransaction((db) => {
    const now = getCurrentTimestamp();
    const stockKey = variantId || '';
    
    db.prepare(`
      UPDATE stock_levels
      SET low_stock_threshold = ?,
          last_updated = ?
      WHERE item_id = ? AND variant_id = ? AND warehouse_id = ?
    `).run(threshold, now, itemId, stockKey, warehouseId);
    
    return { success: true };
  });
}

/**
 * Update reorder point and reorder quantity
 */
function updateReorderPoint(itemId, variantId, warehouseId, reorderPoint, reorderQuantity) {
  return withTransaction((db) => {
    const now = getCurrentTimestamp();
    const stockKey = variantId || '';
    
    // Check if stock level exists
    const existing = db.prepare(`
      SELECT * FROM stock_levels
      WHERE item_id = ? AND variant_id = ? AND warehouse_id = ?
    `).get(itemId, stockKey, warehouseId);
    
    if (existing) {
      db.prepare(`
        UPDATE stock_levels
        SET low_stock_threshold = ?,
            reorder_quantity = ?,
            last_updated = ?
        WHERE item_id = ? AND variant_id = ? AND warehouse_id = ?
      `).run(reorderPoint, reorderQuantity, now, itemId, stockKey, warehouseId);
    } else {
      // Create stock level if it doesn't exist
      db.prepare(`
        INSERT INTO stock_levels (
          item_id, variant_id, warehouse_id,
          quantity, reserved_quantity, low_stock_threshold, reorder_quantity, last_updated
        )
        VALUES (?, ?, ?, 0, 0, ?, ?, ?)
      `).run(itemId, stockKey, warehouseId, reorderPoint, reorderQuantity, now);
    }
    
    return { success: true };
  });
}

/**
 * Get items needing reorder
 */
function getItemsNeedingReorder(warehouseId = null) {
  const db = getDatabase();
  let query = `
    SELECT sl.*, i.name as item_name, i.sku as item_sku, w.name as warehouse_name
    FROM stock_levels sl
    JOIN items i ON sl.item_id = i.id
    JOIN warehouses w ON sl.warehouse_id = w.id
    WHERE sl.quantity <= sl.low_stock_threshold
    AND sl.low_stock_threshold > 0
    AND sl.reorder_quantity > 0
  `;
  const params = [];
  
  if (warehouseId) {
    query += ' AND sl.warehouse_id = ?';
    params.push(warehouseId);
  }
  
  query += ' ORDER BY (sl.quantity - sl.low_stock_threshold) ASC';
  
  const items = db.prepare(query).all(...params);
  
  return items.map(item => ({
    itemId: item.item_id,
    variantId: item.variant_id || undefined,
    warehouseId: item.warehouse_id,
    currentQuantity: item.quantity,
    reorderPoint: item.low_stock_threshold,
    reorderQuantity: item.reorder_quantity,
    itemName: item.item_name,
    itemSku: item.item_sku,
    warehouseName: item.warehouse_name,
    shortfall: Math.max(0, item.low_stock_threshold - item.quantity),
  }));
}

/**
 * Get reorder suggestions based on sales history
 */
function getReorderSuggestions(warehouseId = null) {
  const db = getDatabase();
  
  // Get items with low stock and calculate suggested reorder quantity
  // based on average monthly sales from stock transactions
  let query = `
    SELECT 
      sl.item_id,
      sl.variant_id,
      sl.warehouse_id,
      sl.quantity as current_quantity,
      sl.low_stock_threshold,
      sl.reorder_quantity,
      i.name as item_name,
      i.sku as item_sku,
      w.name as warehouse_name,
      COALESCE(avg_sales.avg_monthly_sales, 0) as avg_monthly_sales
    FROM stock_levels sl
    JOIN items i ON sl.item_id = i.id
    JOIN warehouses w ON sl.warehouse_id = w.id
    LEFT JOIN (
      SELECT 
        item_id,
        variant_id,
        warehouse_id,
        AVG(monthly_quantity) as avg_monthly_sales
      FROM (
        SELECT 
          item_id,
          COALESCE(variant_id, '') as variant_id,
          warehouse_id,
          strftime('%Y-%m', created_at) as month,
          SUM(ABS(quantity)) as monthly_quantity
        FROM stock_transactions
        WHERE transaction_type = 'SALE'
        AND created_at >= datetime('now', '-6 months')
        GROUP BY item_id, variant_id, warehouse_id, month
      ) monthly_sales
      GROUP BY item_id, variant_id, warehouse_id
    ) avg_sales ON sl.item_id = avg_sales.item_id 
      AND COALESCE(sl.variant_id, '') = avg_sales.variant_id
      AND sl.warehouse_id = avg_sales.warehouse_id
    WHERE sl.quantity <= sl.low_stock_threshold
    AND sl.low_stock_threshold > 0
  `;
  const params = [];
  
  if (warehouseId) {
    query += ' AND sl.warehouse_id = ?';
    params.push(warehouseId);
  }
  
  query += ' ORDER BY sl.quantity ASC';
  
  const suggestions = db.prepare(query).all(...params);
  
  return suggestions.map(suggestion => {
    // Suggested reorder quantity: enough for 2 months of average sales
    // or current reorder quantity, whichever is higher
    const suggestedQty = Math.max(
      Math.ceil(suggestion.avg_monthly_sales * 2),
      suggestion.reorder_quantity || 0
    );
    
    return {
      itemId: suggestion.item_id,
      variantId: suggestion.variant_id || undefined,
      warehouseId: suggestion.warehouse_id,
      currentQuantity: suggestion.current_quantity,
      reorderPoint: suggestion.low_stock_threshold,
      currentReorderQuantity: suggestion.reorder_quantity || 0,
      suggestedReorderQuantity: suggestedQty,
      avgMonthlySales: suggestion.avg_monthly_sales || 0,
      itemName: suggestion.item_name,
      itemSku: suggestion.item_sku,
      warehouseName: suggestion.warehouse_name,
    };
  });
}

/**
 * Get stock transactions
 */
function getStockTransactions(filters = {}) {
  const db = getDatabase();
  let query = 'SELECT * FROM stock_transactions WHERE 1=1';
  const params = [];
  
  if (filters.itemId) {
    query += ' AND item_id = ?';
    params.push(filters.itemId);
  }
  
  if (filters.warehouseId) {
    query += ' AND warehouse_id = ?';
    params.push(filters.warehouseId);
  }
  
  if (filters.transactionType) {
    query += ' AND transaction_type = ?';
    params.push(filters.transactionType);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const transactions = db.prepare(query).all(...params);
  
  return transactions.map(txn => ({
    id: txn.id,
    itemId: txn.item_id,
    variantId: txn.variant_id || undefined,
    warehouseId: txn.warehouse_id,
    transactionType: txn.transaction_type,
    quantity: txn.quantity,
    unitCost: txn.unit_cost || null,
    referenceType: txn.reference_type,
    referenceId: txn.reference_id,
    notes: txn.notes,
    createdAt: txn.created_at,
    updatedAt: txn.updated_at,
    syncStatus: txn.sync_status,
    deviceId: txn.device_id,
  }));
}

/**
 * Calculate FIFO valuation for an item
 */
function calculateFIFOValuation(itemId, variantId, warehouseId) {
  const db = getDatabase();
  const stockKey = variantId || '';
  
  // Get all purchase transactions ordered by date (oldest first)
  const purchases = db.prepare(`
    SELECT quantity, unit_cost, created_at
    FROM stock_transactions
    WHERE item_id = ? AND variant_id = ? AND warehouse_id = ?
    AND transaction_type = 'PURCHASE'
    AND quantity > 0
    ORDER BY created_at ASC
  `).all(itemId, stockKey, warehouseId);
  
  // Get current stock level
  const stockLevel = db.prepare(`
    SELECT quantity FROM stock_levels
    WHERE item_id = ? AND variant_id = ? AND warehouse_id = ?
  `).get(itemId, stockKey, warehouseId);
  
  if (!stockLevel || stockLevel.quantity === 0) {
    return {
      totalCost: 0,
      totalQuantity: 0,
      averageCost: 0,
      method: 'FIFO',
    };
  }
  
  let remainingQty = stockLevel.quantity;
  let totalCost = 0;
  
  // Calculate cost using FIFO (oldest purchases first)
  for (const purchase of purchases) {
    if (remainingQty <= 0) break;
    
    const qtyToUse = Math.min(remainingQty, purchase.quantity);
    const cost = (purchase.unit_cost || 0) * qtyToUse;
    totalCost += cost;
    remainingQty -= qtyToUse;
  }
  
  return {
    totalCost,
    totalQuantity: stockLevel.quantity,
    averageCost: stockLevel.quantity > 0 ? totalCost / stockLevel.quantity : 0,
    method: 'FIFO',
  };
}

/**
 * Calculate LIFO valuation for an item
 */
function calculateLIFOValuation(itemId, variantId, warehouseId) {
  const db = getDatabase();
  const stockKey = variantId || '';
  
  // Get all purchase transactions ordered by date (newest first)
  const purchases = db.prepare(`
    SELECT quantity, unit_cost, created_at
    FROM stock_transactions
    WHERE item_id = ? AND variant_id = ? AND warehouse_id = ?
    AND transaction_type = 'PURCHASE'
    AND quantity > 0
    ORDER BY created_at DESC
  `).all(itemId, stockKey, warehouseId);
  
  // Get current stock level
  const stockLevel = db.prepare(`
    SELECT quantity FROM stock_levels
    WHERE item_id = ? AND variant_id = ? AND warehouse_id = ?
  `).get(itemId, stockKey, warehouseId);
  
  if (!stockLevel || stockLevel.quantity === 0) {
    return {
      totalCost: 0,
      totalQuantity: 0,
      averageCost: 0,
      method: 'LIFO',
    };
  }
  
  let remainingQty = stockLevel.quantity;
  let totalCost = 0;
  
  // Calculate cost using LIFO (newest purchases first)
  for (const purchase of purchases) {
    if (remainingQty <= 0) break;
    
    const qtyToUse = Math.min(remainingQty, purchase.quantity);
    const cost = (purchase.unit_cost || 0) * qtyToUse;
    totalCost += cost;
    remainingQty -= qtyToUse;
  }
  
  return {
    totalCost,
    totalQuantity: stockLevel.quantity,
    averageCost: stockLevel.quantity > 0 ? totalCost / stockLevel.quantity : 0,
    method: 'LIFO',
  };
}

/**
 * Calculate weighted average valuation for an item
 */
function calculateWeightedAverageValuation(itemId, variantId, warehouseId) {
  const db = getDatabase();
  const stockKey = variantId || '';
  
  // Get all purchase transactions
  const purchases = db.prepare(`
    SELECT quantity, unit_cost
    FROM stock_transactions
    WHERE item_id = ? AND variant_id = ? AND warehouse_id = ?
    AND transaction_type = 'PURCHASE'
    AND quantity > 0
    AND unit_cost IS NOT NULL
  `).all(itemId, stockKey, warehouseId);
  
  // Get current stock level
  const stockLevel = db.prepare(`
    SELECT quantity FROM stock_levels
    WHERE item_id = ? AND variant_id = ? AND warehouse_id = ?
  `).get(itemId, stockKey, warehouseId);
  
  if (!stockLevel || stockLevel.quantity === 0 || purchases.length === 0) {
    return {
      totalCost: 0,
      totalQuantity: 0,
      averageCost: 0,
      method: 'WEIGHTED_AVERAGE',
    };
  }
  
  // Calculate weighted average
  let totalCost = 0;
  let totalQuantity = 0;
  
  for (const purchase of purchases) {
    const cost = (purchase.unit_cost || 0) * purchase.quantity;
    totalCost += cost;
    totalQuantity += purchase.quantity;
  }
  
  const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;
  const currentValue = averageCost * stockLevel.quantity;
  
  return {
    totalCost: currentValue,
    totalQuantity: stockLevel.quantity,
    averageCost,
    method: 'WEIGHTED_AVERAGE',
  };
}

/**
 * Get inventory valuation for an item using specified method
 */
function getInventoryValuation(itemId, variantId, warehouseId, method) {
  switch (method) {
    case 'FIFO':
      return calculateFIFOValuation(itemId, variantId, warehouseId);
    case 'LIFO':
      return calculateLIFOValuation(itemId, variantId, warehouseId);
    case 'WEIGHTED_AVERAGE':
      return calculateWeightedAverageValuation(itemId, variantId, warehouseId);
    default:
      return calculateFIFOValuation(itemId, variantId, warehouseId);
  }
}

/**
 * Update item valuation method
 */
function updateItemValuationMethod(itemId, method) {
  return withTransaction((db) => {
    const now = getCurrentTimestamp();
    
    db.prepare(`
      UPDATE items
      SET valuation_method = ?,
          updated_at = ?
      WHERE id = ?
    `).run(method, now, itemId);
    
    return { success: true };
  });
}

/**
 * Calculate cost of goods sold (COGS) for a sale
 */
function calculateCOGS(itemId, variantId, warehouseId, quantity, method) {
  const db = getDatabase();
  const stockKey = variantId || '';
  
  // Get item's valuation method
  const item = db.prepare('SELECT valuation_method FROM items WHERE id = ?').get(itemId);
  const valuationMethod = method || (item?.valuation_method || 'FIFO');
  
  // Get purchase transactions based on method
  let purchases;
  if (valuationMethod === 'LIFO') {
    // LIFO: newest first
    purchases = db.prepare(`
      SELECT quantity, unit_cost, created_at
      FROM stock_transactions
      WHERE item_id = ? AND variant_id = ? AND warehouse_id = ?
      AND transaction_type = 'PURCHASE'
      AND quantity > 0
      ORDER BY created_at DESC
    `).all(itemId, stockKey, warehouseId);
  } else if (valuationMethod === 'FIFO') {
    // FIFO: oldest first
    purchases = db.prepare(`
      SELECT quantity, unit_cost, created_at
      FROM stock_transactions
      WHERE item_id = ? AND variant_id = ? AND warehouse_id = ?
      AND transaction_type = 'PURCHASE'
      AND quantity > 0
      ORDER BY created_at ASC
    `).all(itemId, stockKey, warehouseId);
  } else {
    // Weighted Average: use average cost
    const valuation = calculateWeightedAverageValuation(itemId, variantId, warehouseId);
    return {
      totalCost: valuation.averageCost * quantity,
      quantity,
      method: valuationMethod,
    };
  }
  
  let remainingQty = quantity;
  let totalCost = 0;
  
  for (const purchase of purchases) {
    if (remainingQty <= 0) break;
    
    const qtyToUse = Math.min(remainingQty, purchase.quantity);
    const cost = (purchase.unit_cost || 0) * qtyToUse;
    totalCost += cost;
    remainingQty -= qtyToUse;
  }
  
  return {
    totalCost,
    quantity,
    method: valuationMethod,
  };
}

module.exports = {
  createItem,
  updateItem,
  getItems,
  getItemById,
  getItemByBarcode,
  addStock,
  removeStock,
  transferStock,
  getStockLevels,
  checkStockAvailability,
  getLowStockItems,
  getStockTransactions,
  updateLowStockThreshold,
  updateReorderPoint,
  getItemsNeedingReorder,
  getReorderSuggestions,
  calculateFIFOValuation,
  calculateLIFOValuation,
  calculateWeightedAverageValuation,
  getInventoryValuation,
  updateItemValuationMethod,
  calculateCOGS,
};

