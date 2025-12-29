// Test script for transaction safety
// Run with: node electron/test-transactions.cjs

const { getDatabase } = require('./db/database.cjs');
const { runMigrations } = require('./db/migrations.cjs');
const { withTransaction } = require('./db/transaction.cjs');
const { v4: uuidv4 } = require('uuid');
const { getDeviceId, getCurrentTimestamp } = require('./db/database.cjs');

console.log('Initializing database...');
const db = getDatabase();
runMigrations();

console.log('\n=== Testing Transaction Safety ===\n');

// Clean up any previous test records
db.prepare("DELETE FROM customers WHERE name LIKE 'Transaction Test%'").run();

// Test 1: Successful transaction
console.log('1. Testing successful transaction...');
try {
  const result = withTransaction((db) => {
    const id = uuidv4();
    const deviceId = getDeviceId();
    const now = getCurrentTimestamp();
    
    db.prepare(`
      INSERT INTO customers (id, name, phone, device_id, created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(id, 'Transaction Test 1', '1111111111', deviceId, now, now);
    
    return { success: true, id };
  });
  console.log(`   ✅ Transaction succeeded: ${result.id}`);
  
  // Verify record exists
  const record = db.prepare('SELECT name FROM customers WHERE id = ?').get(result.id);
  if (record) {
    console.log(`   ✅ Record exists: ${record.name}`);
  } else {
    console.log(`   ❌ Record not found!`);
  }
} catch (error) {
  console.log(`   ❌ Transaction failed: ${error.message}`);
}

// Test 2: Failed transaction (should rollback)
console.log('\n2. Testing failed transaction (rollback)...');
try {
  const result = withTransaction((db) => {
    const id = uuidv4();
    const deviceId = getDeviceId();
    const now = getCurrentTimestamp();
    
    db.prepare(`
      INSERT INTO customers (id, name, phone, device_id, created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(id, 'Transaction Test 2', '2222222222', deviceId, now, now);
    
    // Force an error
    throw new Error('Simulated transaction error');
  });
  console.log(`   ❌ Transaction should have failed but didn't!`);
} catch (error) {
  console.log(`   ✅ Transaction correctly rolled back: ${error.message}`);
  
  // Verify record does NOT exist
  const records = db.prepare("SELECT name FROM customers WHERE name = 'Transaction Test 2'").all();
  if (records.length === 0) {
    console.log(`   ✅ Record correctly not created (rolled back)`);
  } else {
    console.log(`   ❌ Record exists when it shouldn't!`);
  }
}

// Test 3: Multiple operations in transaction
console.log('\n3. Testing multiple operations in transaction...');
try {
  const result = withTransaction((db) => {
    const customerId = uuidv4();
    const jobId = uuidv4();
    const deviceId = getDeviceId();
    const now = getCurrentTimestamp();
    
    // Create customer
    db.prepare(`
      INSERT INTO customers (id, name, phone, device_id, created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(customerId, 'Transaction Test 3', '3333333333', deviceId, now, now);
    
    // Create job (requires customer to exist)
    const serviceId = db.prepare('SELECT id FROM service_types LIMIT 1').get()?.id;
    if (!serviceId) {
      throw new Error('No service types found');
    }
    
    db.prepare(`
      INSERT INTO jobs (id, customer_id, service_id, date, amount, payment_status, paid_amount, device_id, created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, 'unpaid', 0, ?, ?, ?, 'PENDING')
    `).run(jobId, customerId, serviceId, now.split('T')[0], 1000, deviceId, now, now);
    
    return { success: true, customerId, jobId };
  });
  console.log(`   ✅ Multi-operation transaction succeeded`);
  console.log(`   ✅ Customer ID: ${result.customerId}`);
  console.log(`   ✅ Job ID: ${result.jobId}`);
  
  // Verify both records exist
  const customer = db.prepare('SELECT name FROM customers WHERE id = ?').get(result.customerId);
  const job = db.prepare('SELECT id FROM jobs WHERE id = ?').get(result.jobId);
  if (customer && job) {
    console.log(`   ✅ Both records exist`);
  } else {
    console.log(`   ❌ Records missing!`);
  }
} catch (error) {
  console.log(`   ❌ Transaction failed: ${error.message}`);
}

// Test 4: Transaction with error in middle
console.log('\n4. Testing transaction with error in middle...');
try {
  const result = withTransaction((db) => {
    const customerId = uuidv4();
    const deviceId = getDeviceId();
    const now = getCurrentTimestamp();
    
    // Create customer
    db.prepare(`
      INSERT INTO customers (id, name, phone, device_id, created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(customerId, 'Transaction Test 4', '4444444444', deviceId, now, now);
    
    // Force error before creating job
    throw new Error('Error after customer creation');
    
    // This should never execute
    const jobId = uuidv4();
    db.prepare(`
      INSERT INTO jobs (id, customer_id, service_id, date, amount, payment_status, paid_amount, device_id, created_at, updated_at, sync_status)
      VALUES (?, ?, ?, ?, ?, 'unpaid', 0, ?, ?, ?, 'PENDING')
    `).run(jobId, customerId, 'service-id', now.split('T')[0], 1000, deviceId, now, now);
  });
  console.log(`   ❌ Transaction should have failed!`);
} catch (error) {
  console.log(`   ✅ Transaction correctly rolled back: ${error.message}`);
  
  // Verify customer was NOT created (rolled back)
  const records = db.prepare("SELECT name FROM customers WHERE name = 'Transaction Test 4'").all();
  if (records.length === 0) {
    console.log(`   ✅ Customer correctly not created (rolled back)`);
  } else {
    console.log(`   ❌ Customer exists when it shouldn't!`);
  }
}

// Summary
console.log('\n=== Summary ===');
const testRecords = db.prepare("SELECT COUNT(*) as count FROM customers WHERE name LIKE 'Transaction Test%'").get();
console.log(`Total test records: ${testRecords.count}`);
console.log('Expected: 2 records (Test 1 and Test 3 succeeded)');
console.log('\n=== All Tests Complete ===\n');

