# Testing Guide: Multi-PC Offline-First Database Setup

This guide provides step-by-step instructions for testing the database setup, device ID management, sync utilities, and multi-PC safety features.

## Prerequisites

1. Application is running (`npm run electron-dev`)
2. Database is initialized (should happen automatically on first launch)
3. SQLite command-line tool installed (optional, for direct DB inspection)

## Test 1: Device ID Generation and Persistence

### Objective

Verify that device ID is generated on first run and persists across restarts.

### Steps

1. **Check Device ID on First Run**

   - Open the Electron app
   - Check console logs for: `Device ID generated (first run): <UUID>`
   - Note the UUID displayed

2. **Verify Device ID Storage**

   - Close the app completely
   - Restart the app
   - Check console logs for: `Device ID loaded: <UUID>`
   - Verify it's the same UUID as before

3. **Verify Device ID Format**
   - Device ID should be a valid UUID v4 format
   - Format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
   - Example: `550e8400-e29b-41d4-a716-446655440000`

### Expected Results

- ✅ Device ID is generated on first run
- ✅ Same device ID is loaded on subsequent runs
- ✅ Device ID is valid UUID format
- ✅ Device ID never changes

### Manual Verification (Optional)

If you have SQLite CLI installed:

```bash
cd /Users/arham/Documents/OffPOS/cleanflow-pos
sqlite3 data/cleanflow.db "SELECT key, value FROM app_settings WHERE key = 'device_id';"
```

---

## Test 2: Record Creation with Standard Fields

### Objective

Verify that all records are created with required fields: `id`, `device_id`, `created_at`, `updated_at`, `sync_status`.

### Steps

1. **Create a Customer**

   - Go to Customers page
   - Click "Add Customer"
   - Fill in: Name: "Test Customer", Phone: "1234567890"
   - Click Save
   - Note the customer ID from the UI

2. **Create a Job**

   - Go to Jobs page
   - Click "Add Job"
   - Select the customer you just created
   - Select a service
   - Enter amount: 1000
   - Click Save
   - Note the job ID

3. **Create a Payment**
   - Go to Payments page
   - Click "Add Payment"
   - Select customer
   - Enter amount: 500
   - Click Save
   - Note the payment ID

### Expected Results

- ✅ All records are created successfully
- ✅ Each record has a UUID `id`
- ✅ Each record has `device_id` matching your device ID
- ✅ Each record has `sync_status = 'PENDING'`
- ✅ `created_at` and `updated_at` are set

### Manual Verification

```bash
# Check customer record
sqlite3 data/cleanflow.db "SELECT id, device_id, sync_status, created_at, updated_at FROM customers LIMIT 1;"

# Check job record
sqlite3 data/cleanflow.db "SELECT id, device_id, sync_status, created_at, updated_at FROM jobs LIMIT 1;"

# Check payment record
sqlite3 data/cleanflow.db "SELECT id, device_id, sync_status, created_at, updated_at FROM payments LIMIT 1;"
```

---

## Test 3: Device ID Preservation on Updates

### Objective

Verify that `device_id` is never overwritten when updating records.

### Steps

1. **Update a Customer**

   - Go to Customers page
   - Edit the customer you created
   - Change the phone number
   - Save

2. **Update a Job**
   - Go to Jobs page
   - Edit the job you created
   - Change the amount
   - Save

### Expected Results

- ✅ Records update successfully
- ✅ `device_id` remains unchanged
- ✅ `updated_at` changes to new timestamp
- ✅ `sync_status` changes back to `'PENDING'`
- ✅ `created_at` remains unchanged

### Manual Verification

```bash
# Get device_id before update
sqlite3 data/cleanflow.db "SELECT id, device_id FROM customers WHERE name = 'Test Customer';"

# Update the customer (via UI)

# Verify device_id unchanged
sqlite3 data/cleanflow.db "SELECT id, device_id, updated_at FROM customers WHERE name = 'Test Customer';"
```

---

## Test 4: Sync Utilities

### Objective

Test the sync utility functions to query pending records and manage sync status.

### Steps

1. **Create Test Script**

   - Create a test file: `electron/test-sync-utils.cjs`
   - Copy the test code below

2. **Run Test Script**
   ```bash
   cd /Users/arham/Documents/OffPOS/cleanflow-pos
   node electron/test-sync-utils.cjs
   ```

### Test Script Code

```javascript
// electron/test-sync-utils.cjs
const { getDatabase } = require("./db/database.cjs");
const { runMigrations } = require("./db/migrations.cjs");
const syncUtils = require("./db/sync-utils.cjs");

// Initialize database
const db = getDatabase();
runMigrations();

console.log("\n=== Testing Sync Utilities ===\n");

// Test 1: Get pending count
console.log("1. Testing getPendingCount()");
const pendingCustomers = syncUtils.getPendingCount("customers");
console.log(`   Pending customers: ${pendingCustomers}`);

// Test 2: Get pending records
console.log("\n2. Testing getPendingRecords()");
const pending = syncUtils.getPendingRecords("customers", 10);
console.log(`   Found ${pending.length} pending customer records`);
if (pending.length > 0) {
  console.log(`   First record ID: ${pending[0].id}`);
  console.log(`   First record device_id: ${pending[0].device_id}`);
}

// Test 3: Get all pending records
console.log("\n3. Testing getAllPendingRecords()");
const allPending = syncUtils.getAllPendingRecords(10);
console.log("   Pending records by table:");
for (const [table, records] of Object.entries(allPending)) {
  console.log(`     ${table}: ${records.length} records`);
}

// Test 4: Get total pending count
console.log("\n4. Testing getTotalPendingCount()");
const totalPending = syncUtils.getTotalPendingCount();
console.log(`   Total pending records: ${totalPending}`);

// Test 5: Get sync statistics
console.log("\n5. Testing getSyncStatistics()");
const stats = syncUtils.getSyncStatistics();
console.log("   Sync statistics:");
for (const [table, tableStats] of Object.entries(stats)) {
  console.log(`     ${table}:`);
  console.log(`       PENDING: ${tableStats.PENDING}`);
  console.log(`       SYNCED: ${tableStats.SYNCED}`);
  console.log(`       FAILED: ${tableStats.FAILED}`);
  console.log(`       TOTAL: ${tableStats.TOTAL}`);
}

// Test 6: Mark as synced (if we have records)
if (pending.length > 0) {
  console.log("\n6. Testing markAsSynced()");
  const testRecordId = pending[0].id;
  const success = syncUtils.markAsSynced("customers", testRecordId);
  console.log(`   Marked record ${testRecordId} as synced: ${success}`);

  // Verify
  const record = db
    .prepare("SELECT sync_status FROM customers WHERE id = ?")
    .get(testRecordId);
  console.log(`   Record sync_status: ${record.sync_status}`);

  // Reset back to PENDING for testing
  db.prepare("UPDATE customers SET sync_status = 'PENDING' WHERE id = ?").run(
    testRecordId
  );
  console.log("   Reset back to PENDING");
}

console.log("\n=== All Tests Complete ===\n");
```

### Expected Results

- ✅ All sync utility functions work correctly
- ✅ Pending records are queried correctly
- ✅ Sync statistics are accurate
- ✅ Records can be marked as synced

---

## Test 5: Ledger Immutability

### Objective

Verify that ledger entries cannot be updated or deleted.

### Steps

1. **Create a Job** (this automatically creates a ledger entry)

   - Create a job for a customer
   - Note the ledger entry was created

2. **Try to Update Ledger Entry** (should fail)

   ```bash
   sqlite3 data/cleanflow.db "UPDATE ledger_entries SET amount = 999 WHERE id = (SELECT id FROM ledger_entries LIMIT 1);"
   ```

3. **Try to Delete Ledger Entry** (should fail)
   ```bash
   sqlite3 data/cleanflow.db "DELETE FROM ledger_entries WHERE id = (SELECT id FROM ledger_entries LIMIT 1);"
   ```

### Expected Results

- ✅ UPDATE fails with error: "Ledger entries cannot be modified"
- ✅ DELETE fails with error: "Ledger entries cannot be deleted"
- ✅ Triggers are working correctly

---

## Test 6: Multi-PC Simulation

### Objective

Simulate multiple PCs by creating records with different device IDs.

### Steps

1. **Get Current Device ID**

   ```bash
   sqlite3 data/cleanflow.db "SELECT value FROM app_settings WHERE key = 'device_id';"
   ```

   Note this UUID (e.g., `device-id-1`)

2. **Create Records with Different Device IDs**

   ```bash
   # Create a customer with a different device_id (simulating PC 2)
   sqlite3 data/cleanflow.db "
   INSERT INTO customers (
     id, name, phone, device_id, created_at, updated_at, sync_status
   ) VALUES (
     'test-uuid-123',
     'PC2 Customer',
     '9999999999',
     'device-id-2',
     datetime('now'),
     datetime('now'),
     'PENDING'
   );
   "
   ```

3. **Verify Both Records Exist**

   ```bash
   sqlite3 data/cleanflow.db "SELECT id, name, device_id FROM customers;"
   ```

4. **Query Records by Device ID**

   ```bash
   # Get records from current device
   sqlite3 data/cleanflow.db "SELECT COUNT(*) FROM customers WHERE device_id = (SELECT value FROM app_settings WHERE key = 'device_id');"

   # Get records from simulated PC2
   sqlite3 data/cleanflow.db "SELECT COUNT(*) FROM customers WHERE device_id = 'device-id-2';"
   ```

### Expected Results

- ✅ Records with different device IDs coexist
- ✅ Same UUID (`test-uuid-123`) can exist with different device IDs
- ✅ Queries filter correctly by device_id
- ✅ This demonstrates multi-PC safety

---

## Test 7: Sync Status Lifecycle

### Objective

Test the sync status lifecycle: PENDING → SYNCED → FAILED → PENDING.

### Steps

1. **Create a Record** (starts as PENDING)

   - Create a new customer via UI
   - Verify `sync_status = 'PENDING'`

2. **Mark as Synced** (simulate successful sync)

   ```bash
   sqlite3 data/cleanflow.db "
   UPDATE customers
   SET sync_status = 'SYNCED'
   WHERE name = 'Test Customer';
   "
   ```

3. **Verify Status Changed**

   ```bash
   sqlite3 data/cleanflow.db "SELECT name, sync_status FROM customers WHERE name = 'Test Customer';"
   ```

4. **Mark as Failed** (simulate sync failure)

   ```bash
   sqlite3 data/cleanflow.db "
   UPDATE customers
   SET sync_status = 'FAILED'
   WHERE name = 'Test Customer';
   "
   ```

5. **Reset to PENDING** (for retry)
   ```bash
   sqlite3 data/cleanflow.db "
   UPDATE customers
   SET sync_status = 'PENDING'
   WHERE name = 'Test Customer';
   "
   ```

### Expected Results

- ✅ Sync status transitions work correctly
- ✅ All three statuses are valid
- ✅ Status can be reset for retry

---

## Test 8: Database Schema Verification

### Objective

Verify all tables have required fields and indexes.

### Steps

1. **Check Table Schema**

   ```bash
   sqlite3 data/cleanflow.db ".schema customers"
   sqlite3 data/cleanflow.db ".schema jobs"
   sqlite3 data/cleanflow.db ".schema ledger_entries"
   ```

2. **Verify Required Fields Exist**

   ```bash
   sqlite3 data/cleanflow.db "
   SELECT sql FROM sqlite_master
   WHERE type='table' AND name='customers';
   "
   ```

3. **Check Indexes**
   ```bash
   sqlite3 data/cleanflow.db "
   SELECT name FROM sqlite_master
   WHERE type='index' AND name LIKE 'idx_%';
   "
   ```

### Expected Results

- ✅ All tables have: `id`, `device_id`, `created_at`, `updated_at`, `sync_status`
- ✅ All sync-related indexes exist
- ✅ Ledger table has triggers

---

## Test 9: Transaction Safety

### Objective

Verify that transactions work correctly and prevent partial updates.

### Steps

1. **Create a Test Script**

   ```javascript
   // electron/test-transactions.cjs
   const { getDatabase } = require("./db/database.cjs");
   const { withTransaction } = require("./db/transaction.cjs");
   const { v4: uuidv4 } = require("uuid");
   const { getDeviceId, getCurrentTimestamp } = require("./db/database.cjs");

   const db = getDatabase();

   console.log("Testing transaction safety...");

   // Test: Successful transaction
   try {
     const result = withTransaction((db) => {
       const id = uuidv4();
       const deviceId = getDeviceId();
       const now = getCurrentTimestamp();

       db.prepare(
         `
         INSERT INTO customers (id, name, phone, device_id, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
       `
       ).run(id, "Transaction Test", "1111111111", deviceId, now, now);

       return { success: true, id };
     });
     console.log("✅ Transaction succeeded:", result.id);
   } catch (error) {
     console.log("❌ Transaction failed:", error.message);
   }

   // Test: Failed transaction (should rollback)
   try {
     const result = withTransaction((db) => {
       const id = uuidv4();
       const deviceId = getDeviceId();
       const now = getCurrentTimestamp();

       db.prepare(
         `
         INSERT INTO customers (id, name, phone, device_id, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
       `
       ).run(id, "Transaction Test 2", "2222222222", deviceId, now, now);

       // Force an error
       throw new Error("Simulated error");
     });
     console.log("❌ Transaction should have failed");
   } catch (error) {
     console.log("✅ Transaction correctly rolled back:", error.message);
   }

   // Verify: First record exists, second doesn't
   const records = db
     .prepare("SELECT name FROM customers WHERE name LIKE 'Transaction Test%'")
     .all();
   console.log("Records after transaction test:", records.length);
   console.log("Expected: 1 record (first succeeded, second rolled back)");
   ```

2. **Run Test**
   ```bash
   node electron/test-transactions.cjs
   ```

### Expected Results

- ✅ Successful transaction commits all changes
- ✅ Failed transaction rolls back all changes
- ✅ No partial updates occur

---

## Test 10: Server Schema (PostgreSQL)

### Objective

Verify the PostgreSQL schema can be created and functions work.

### Prerequisites

- PostgreSQL installed and running
- Database created: `cleanflow_pos`

### Steps

1. **Create Database**

   ```bash
   createdb cleanflow_pos
   ```

2. **Run Schema**

   ```bash
   psql cleanflow_pos < server/schema.sql
   ```

3. **Verify Tables Created**

   ```bash
   psql cleanflow_pos -c "\dt"
   ```

4. **Test Sync Function**

   ```bash
   psql cleanflow_pos -c "
   SELECT sync_customer(
     'test-id-1',
     'device-id-1',
     'Test Customer',
     '1234567890',
     '123 Main St',
     0,
     NOW(),
     NOW(),
     'PENDING'
   );
   "
   ```

5. **Verify Record Inserted**

   ```bash
   psql cleanflow_pos -c "SELECT * FROM customers WHERE id = 'test-id-1';"
   ```

6. **Test Idempotency** (run same sync again)

   ```bash
   psql cleanflow_pos -c "
   SELECT sync_customer(
     'test-id-1',
     'device-id-1',
     'Updated Customer',
     '9999999999',
     '456 Oak Ave',
     100,
     NOW(),
     NOW(),
     'SYNCED'
   );
   "
   ```

7. **Verify Update** (should have updated values)
   ```bash
   psql cleanflow_pos -c "SELECT * FROM customers WHERE id = 'test-id-1';"
   ```

### Expected Results

- ✅ Schema creates successfully
- ✅ All tables exist with composite keys
- ✅ Sync functions work
- ✅ Idempotent sync handles duplicates
- ✅ Last update wins (updated values)

---

## Quick Test Checklist

Use this checklist to quickly verify everything works:

- [ ] Device ID generated on first run
- [ ] Device ID persists across restarts
- [ ] Records created with all standard fields
- [ ] Device ID preserved on updates
- [ ] Sync utilities query pending records
- [ ] Ledger entries cannot be updated
- [ ] Ledger entries cannot be deleted
- [ ] Multiple device IDs coexist safely
- [ ] Sync status transitions work
- [ ] Transactions rollback on errors
- [ ] Server schema creates successfully (if PostgreSQL available)

---

## Troubleshooting

### Device ID Not Generated

- Check console logs for errors
- Verify `app_settings` table exists
- Check database file permissions

### Records Missing Standard Fields

- Verify migrations ran successfully
- Check `migrations` table for executed migrations
- Re-run migrations if needed

### Sync Utilities Not Working

- Verify database is initialized
- Check that records exist with `sync_status = 'PENDING'`
- Verify device_id matches current device

### Ledger Triggers Not Working

- Check triggers exist: `SELECT * FROM sqlite_master WHERE type='trigger';`
- Verify trigger names: `prevent_ledger_update`, `prevent_ledger_delete`

---

_Test Guide Version: 1.0_  
_Last Updated: December 2024_
