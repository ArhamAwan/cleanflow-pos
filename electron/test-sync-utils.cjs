// Test script for sync utilities
// Run with: node electron/test-sync-utils.cjs
// Note: This must be run from within Electron app context
// Or set NODE_ENV=development and ensure Electron app is available

// Mock Electron app if not available
if (typeof require !== 'undefined') {
  try {
    const { app } = require('electron');
    if (!app) {
      throw new Error('Electron app not available');
    }
  } catch (error) {
    // Mock app for standalone testing
    const path = require('path');
    const mockApp = {
      isPackaged: false,
      getPath: () => path.join(__dirname, '..', 'data')
    };
    require.cache[require.resolve('electron')] = {
      exports: { app: mockApp }
    };
  }
}

const { getDatabase } = require('./db/database.cjs');
const { runMigrations } = require('./db/migrations.cjs');
const syncUtils = require('./db/sync-utils.cjs');

// Initialize database
console.log('Initializing database...');
try {
  const db = getDatabase();
  runMigrations();
} catch (error) {
  console.error('❌ Database initialization failed:', error.message);
  console.error('   This script should be run from within Electron app context');
  console.error('   Or test via the UI instead');
  process.exit(1);
}

console.log('\n=== Testing Sync Utilities ===\n');

// Test 1: Get pending count
console.log('1. Testing getPendingCount()');
try {
  const pendingCustomers = syncUtils.getPendingCount('customers');
  console.log(`   ✅ Pending customers: ${pendingCustomers}`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// Test 2: Get pending records
console.log('\n2. Testing getPendingRecords()');
try {
  const pending = syncUtils.getPendingRecords('customers', 10);
  console.log(`   ✅ Found ${pending.length} pending customer records`);
  if (pending.length > 0) {
    console.log(`   First record ID: ${pending[0].id}`);
    console.log(`   First record device_id: ${pending[0].device_id}`);
    console.log(`   First record sync_status: ${pending[0].sync_status}`);
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// Test 3: Get all pending records
console.log('\n3. Testing getAllPendingRecords()');
try {
  const allPending = syncUtils.getAllPendingRecords(10);
  console.log('   ✅ Pending records by table:');
  for (const [table, records] of Object.entries(allPending)) {
    console.log(`     ${table}: ${records.length} records`);
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// Test 4: Get total pending count
console.log('\n4. Testing getTotalPendingCount()');
try {
  const totalPending = syncUtils.getTotalPendingCount();
  console.log(`   ✅ Total pending records: ${totalPending}`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// Test 5: Get sync statistics
console.log('\n5. Testing getSyncStatistics()');
try {
  const stats = syncUtils.getSyncStatistics();
  console.log('   ✅ Sync statistics:');
  for (const [table, tableStats] of Object.entries(stats)) {
    if (tableStats.TOTAL > 0) {
      console.log(`     ${table}:`);
      console.log(`       PENDING: ${tableStats.PENDING}`);
      console.log(`       SYNCED: ${tableStats.SYNCED}`);
      console.log(`       FAILED: ${tableStats.FAILED}`);
      console.log(`       TOTAL: ${tableStats.TOTAL}`);
    }
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// Test 6: Mark as synced (if we have records)
console.log('\n6. Testing markAsSynced()');
try {
  const pending = syncUtils.getPendingRecords('customers', 1);
  if (pending.length > 0) {
    const testRecordId = pending[0].id;
    const success = syncUtils.markAsSynced('customers', testRecordId);
    console.log(`   ✅ Marked record ${testRecordId} as synced: ${success}`);
    
    // Verify
    const record = db.prepare('SELECT sync_status FROM customers WHERE id = ?').get(testRecordId);
    console.log(`   ✅ Record sync_status: ${record.sync_status}`);
    
    // Reset back to PENDING for testing
    db.prepare("UPDATE customers SET sync_status = 'PENDING' WHERE id = ?").run(testRecordId);
    console.log('   ✅ Reset back to PENDING');
  } else {
    console.log('   ⚠️  No pending records to test with');
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// Test 7: Mark as failed
console.log('\n7. Testing markAsFailed()');
try {
  const pending = syncUtils.getPendingRecords('customers', 1);
  if (pending.length > 0) {
    const testRecordId = pending[0].id;
    const success = syncUtils.markAsFailed('customers', testRecordId);
    console.log(`   ✅ Marked record ${testRecordId} as failed: ${success}`);
    
    // Verify
    const record = db.prepare('SELECT sync_status FROM customers WHERE id = ?').get(testRecordId);
    console.log(`   ✅ Record sync_status: ${record.sync_status}`);
    
    // Reset back to PENDING
    db.prepare("UPDATE customers SET sync_status = 'PENDING' WHERE id = ?").run(testRecordId);
    console.log('   ✅ Reset back to PENDING');
  } else {
    console.log('   ⚠️  No pending records to test with');
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// Test 8: Reset failed records
console.log('\n8. Testing resetFailedRecords()');
try {
  const resetCount = syncUtils.resetFailedRecords('customers');
  console.log(`   ✅ Reset ${resetCount} failed records back to PENDING`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

console.log('\n=== All Tests Complete ===\n');

