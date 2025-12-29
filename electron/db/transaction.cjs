const { getDatabase } = require('./database.cjs');

/**
 * Transaction Wrapper
 * Provides ACID-compliant transaction handling for all financial operations
 * 
 * Usage:
 * const result = withTransaction((db) => {
 *   // All database operations here
 *   // Either all succeed or all rollback
 *   return { success: true, data: ... };
 * });
 */

/**
 * Execute a function within a transaction
 * @param {Function} fn - Function to execute within transaction
 * @returns {*} Result of the function
 * @throws {Error} If transaction fails
 */
function withTransaction(fn) {
  const db = getDatabase();
  
  // Use better-sqlite3's built-in transaction wrapper
  // This automatically handles BEGIN, COMMIT, and ROLLBACK
  const transactionFn = db.transaction(fn);
  
  try {
    return transactionFn(db);
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}

/**
 * Execute a function within a transaction with explicit control
 * Useful for complex operations that need manual commit/rollback control
 * @param {Function} fn - Function to execute
 * @returns {*} Result of the function
 */
function withExplicitTransaction(fn) {
  const db = getDatabase();
  
  db.exec('BEGIN TRANSACTION');
  
  try {
    const result = fn(db);
    db.exec('COMMIT');
    return result;
  } catch (error) {
    console.error('Transaction failed, rolling back:', error);
    db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Execute multiple operations as a batch within a single transaction
 * @param {Array<Function>} operations - Array of operations to execute
 * @returns {Array} Results of all operations
 */
function batchTransaction(operations) {
  return withTransaction((db) => {
    const results = [];
    
    for (const operation of operations) {
      const result = operation(db);
      results.push(result);
    }
    
    return results;
  });
}

module.exports = {
  withTransaction,
  withExplicitTransaction,
  batchTransaction,
};
