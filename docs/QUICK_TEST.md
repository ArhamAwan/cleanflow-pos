# Quick Testing Guide

## Method 1: Test via UI (Easiest)

1. **Start the app**
   ```bash
   cd /Users/arham/Documents/OffPOS/cleanflow-pos
   npm run electron-dev
   ```

2. **Check Device ID**
   - Look at the console output
   - You should see: `Device ID generated (first run): <UUID>` or `Device ID loaded: <UUID>`
   - Note the UUID

3. **Create Test Records**
   - Add a customer
   - Add a job
   - Add a payment
   - All should work normally

4. **Verify Records in Database**
   ```bash
   sqlite3 data/cleanflow.db "SELECT id, name, device_id, sync_status FROM customers LIMIT 5;"
   ```

## Method 2: Test via SQLite CLI (Direct Database Access)

### Check Device ID
```bash
cd /Users/arham/Documents/OffPOS/cleanflow-pos
sqlite3 data/cleanflow.db "SELECT key, value FROM app_settings WHERE key = 'device_id';"
```

### Check Records Have Standard Fields
```bash
sqlite3 data/cleanflow.db "
SELECT 
  id, 
  name, 
  device_id, 
  sync_status, 
  created_at, 
  updated_at 
FROM customers 
LIMIT 1;
"
```

### Check Sync Status Distribution
```bash
sqlite3 data/cleanflow.db "
SELECT 
  sync_status, 
  COUNT(*) as count 
FROM customers 
GROUP BY sync_status;
"
```

### Check Pending Records
```bash
sqlite3 data/cleanflow.db "
SELECT COUNT(*) as pending_count 
FROM customers 
WHERE sync_status = 'PENDING';
"
```

### Test Ledger Immutability
```bash
# Try to update (should fail)
sqlite3 data/cleanflow.db "
UPDATE ledger_entries 
SET debit = 999 
WHERE id = (SELECT id FROM ledger_entries LIMIT 1);
"
# Expected: Error: "Ledger entries cannot be modified"

# Try to delete (should fail)
sqlite3 data/cleanflow.db "
DELETE FROM ledger_entries 
WHERE id = (SELECT id FROM ledger_entries LIMIT 1);
"
# Expected: Error: "Ledger entries cannot be deleted"
```

### Check All Tables Have Required Fields
```bash
sqlite3 data/cleanflow.db "
SELECT sql FROM sqlite_master 
WHERE type='table' 
AND name IN ('customers', 'jobs', 'payments', 'expenses', 'ledger_entries');
"
```

### Check Indexes Exist
```bash
sqlite3 data/cleanflow.db "
SELECT name FROM sqlite_master 
WHERE type='index' 
AND name LIKE 'idx_%device_id%';
"
```

## Method 3: Test Sync Utilities (Requires Electron Context)

The sync utilities can be tested by adding a test IPC handler or by testing through the app.

### Add Test IPC Handler (Optional)

Add to `electron/ipc/handlers.cjs`:
```javascript
ipcMain.handle('test:sync-stats', async () => {
  const syncUtils = require('../db/sync-utils.cjs');
  return syncUtils.getSyncStatistics();
});
```

Then call from React:
```javascript
const stats = await electronAPI.test.getSyncStats();
console.log(stats);
```

## Expected Results

### ✅ Device ID
- Generated on first run
- Persists across restarts
- Valid UUID format
- Never changes

### ✅ Records
- All have `id` (UUID)
- All have `device_id` (matches device ID)
- All have `sync_status` (defaults to 'PENDING')
- All have `created_at` and `updated_at`

### ✅ Updates
- `device_id` never changes
- `created_at` never changes
- `updated_at` changes on update
- `sync_status` resets to 'PENDING' on update

### ✅ Ledger
- Cannot UPDATE ledger entries
- Cannot DELETE ledger entries
- Triggers prevent modifications

### ✅ Multi-PC Safety
- Records with different `device_id` coexist
- Same UUID from different devices is allowed
- Queries filter by `device_id` correctly

## Troubleshooting

### Database not found
- Make sure app has run at least once
- Check path: `data/cleanflow.db` (dev) or `app.getPath('userData')/cleanflow.db` (prod)

### Device ID not found
- Check `app_settings` table exists
- Verify migrations ran: `SELECT * FROM migrations;`

### Records missing fields
- Check migrations ran: `SELECT * FROM migrations;`
- Re-run migrations if needed

### Sync utilities not working
- Must be called from Electron context
- Database must be initialized
- Records must exist with `sync_status = 'PENDING'`

