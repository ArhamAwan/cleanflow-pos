# Multi-PC Testing Guide

This guide explains how to test the offline-first POS system on multiple PCs to verify multi-PC safety, device ID generation, and sync-ready design.

## Prerequisites

- Two or more Windows/Mac/Linux PCs
- USB drive or network share for transferring the app
- Basic understanding of file transfers

## Method 1: Development Build (Easiest for Testing)

### Step 1: Build the App Locally

On your development PC:

```bash
cd /Users/arham/Documents/OffPOS/cleanflow-pos

# Install dependencies (if not already done)
npm install

# Build the React app
npm run build
```

### Step 2: Copy Files to Another PC

1. **Copy the entire project folder** to another PC:
   - Via USB drive
   - Via network share
   - Via cloud storage (Dropbox, Google Drive, etc.)

2. **On the second PC**, navigate to the project folder and install dependencies:

```bash
# Windows
cd C:\path\to\cleanflow-pos
npm install

# Mac/Linux
cd /path/to/cleanflow-pos
npm install
```

### Step 3: Run on Each PC

**On PC 1:**
```bash
npm run electron-dev
```

**On PC 2:**
```bash
npm run electron-dev
```

### Step 4: Verify Different Device IDs

1. **On PC 1:**
   - Open the app
   - Navigate to Dashboard → Click "Test Database"
   - Note the Device ID (UUID)

2. **On PC 2:**
   - Open the app
   - Navigate to Dashboard → Click "Test Database"
   - Note the Device ID (UUID)
   - **Verify it's different from PC 1**

### Step 5: Create Test Records

**On PC 1:**
- Create a customer: "PC1 Customer"
- Create a job for that customer
- Note the customer ID and job ID

**On PC 2:**
- Create a customer: "PC2 Customer"
- Create a job for that customer
- Note the customer ID and job ID

### Step 6: Verify Device IDs in Records

**On PC 1:**
```bash
# Check database location
# Windows: %APPDATA%/cleanflow-pos/cleanflow.db
# Mac: ~/Library/Application Support/cleanflow-pos/cleanflow.db
# Linux: ~/.config/cleanflow-pos/cleanflow.db

# Or check in development:
sqlite3 data/cleanflow.db "SELECT id, name, device_id FROM customers;"
```

**On PC 2:**
```bash
sqlite3 data/cleanflow.db "SELECT id, name, device_id FROM customers;"
```

**Expected Results:**
- PC1 Customer has `device_id` matching PC1's Device ID
- PC2 Customer has `device_id` matching PC2's Device ID
- Both records can have the same UUID `id` (different device_ids make them unique)

---

## Method 2: Production Build (More Realistic)

### Step 1: Install electron-builder (if not already installed)

```bash
npm install --save-dev electron-builder
```

### Step 2: Configure Package.json

Add build configuration to `package.json`:

```json
{
  "build": {
    "appId": "com.cleanflow.pos",
    "productName": "CleanFlow POS",
    "directories": {
      "output": "dist"
    },
    "files": [
      "build/**/*",
      "electron/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "win": {
      "target": "nsis",
      "icon": "build/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "build/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "build/icon.png"
    }
  }
}
```

### Step 3: Build for Distribution

**For Windows:**
```bash
npm run build
npm run electron-builder -- --win
```

**For Mac:**
```bash
npm run build
npm run electron-builder -- --mac
```

**For Linux:**
```bash
npm run build
npm run electron-builder -- --linux
```

### Step 4: Install on Another PC

1. Copy the installer from `dist/` folder to another PC
2. Install the app on PC 2
3. Run the installed app

### Step 5: Test Multi-PC Functionality

Follow the same testing steps as Method 1.

---

## Testing Scenarios

### Scenario 1: Different Device IDs

**Test:** Verify each PC gets a unique device ID

**Steps:**
1. Run app on PC 1 → Note Device ID
2. Run app on PC 2 → Note Device ID
3. Verify they are different UUIDs

**Expected:** ✅ Different UUIDs on each PC

---

### Scenario 2: Same UUID from Different Devices

**Test:** Verify that the same UUID can exist from different devices

**Steps:**
1. On PC 1, create customer with ID `test-uuid-123`
2. On PC 2, manually insert customer with same ID but different device_id:
   ```sql
   INSERT INTO customers (
     id, name, device_id, created_at, updated_at, sync_status
   ) VALUES (
     'test-uuid-123',
     'PC2 Customer',
     '<PC2-device-id>',
     datetime('now'),
     datetime('now'),
     'PENDING'
   );
   ```
3. Verify both records exist in their respective databases

**Expected:** ✅ Both records exist separately (different device_ids)

---

### Scenario 3: Records Tagged with Device ID

**Test:** Verify all records include device_id

**Steps:**
1. Create records on PC 1 (customer, job, payment)
2. Check database:
   ```sql
   SELECT id, device_id, sync_status FROM customers;
   SELECT id, device_id, sync_status FROM jobs;
   SELECT id, device_id, sync_status FROM payments;
   ```
3. Verify all have `device_id` matching PC 1's Device ID

**Expected:** ✅ All records have correct device_id

---

### Scenario 4: Sync Status Tracking

**Test:** Verify sync_status is set correctly

**Steps:**
1. Create new records on PC 1
2. Check sync_status:
   ```sql
   SELECT id, sync_status FROM customers WHERE sync_status = 'PENDING';
   ```
3. Verify all new records have `sync_status = 'PENDING'`

**Expected:** ✅ All new records start as PENDING

---

### Scenario 5: Device ID Persistence

**Test:** Verify device ID never changes

**Steps:**
1. Note Device ID on PC 1
2. Close app completely
3. Restart app
4. Check Device ID again
5. Create records, close app, restart
6. Check Device ID again

**Expected:** ✅ Same Device ID every time

---

### Scenario 6: Ledger Immutability

**Test:** Verify ledger entries cannot be modified

**Steps:**
1. Create a job (this creates a ledger entry)
2. Try to update ledger entry:
   ```sql
   UPDATE ledger_entries SET debit = 999 WHERE id = (SELECT id FROM ledger_entries LIMIT 1);
   ```
3. Try to delete ledger entry:
   ```sql
   DELETE FROM ledger_entries WHERE id = (SELECT id FROM ledger_entries LIMIT 1);
   ```

**Expected:** ✅ Both operations fail with error messages

---

## Quick Test Checklist

Use this checklist when testing on multiple PCs:

- [ ] PC 1: App runs successfully
- [ ] PC 1: Device ID is generated (UUID format)
- [ ] PC 2: App runs successfully
- [ ] PC 2: Device ID is generated (different from PC 1)
- [ ] PC 1: Create customer → Has PC 1's device_id
- [ ] PC 2: Create customer → Has PC 2's device_id
- [ ] PC 1: Device ID persists after restart
- [ ] PC 2: Device ID persists after restart
- [ ] PC 1: All records have sync_status = 'PENDING'
- [ ] PC 2: All records have sync_status = 'PENDING'
- [ ] PC 1: Ledger entries cannot be updated/deleted
- [ ] PC 2: Ledger entries cannot be updated/deleted

---

## Database Locations

### Development Mode

- **Windows:** `.\data\cleanflow.db` (in project folder)
- **Mac/Linux:** `./data/cleanflow.db` (in project folder)

### Production Mode

- **Windows:** `%APPDATA%\cleanflow-pos\cleanflow.db`
- **Mac:** `~/Library/Application Support/cleanflow-pos/cleanflow.db`
- **Linux:** `~/.config/cleanflow-pos/cleanflow.db`

---

## SQLite Commands for Testing

### Check Device ID
```bash
sqlite3 data/cleanflow.db "SELECT value FROM app_settings WHERE key = 'device_id';"
```

### Check Records with Device IDs
```bash
sqlite3 data/cleanflow.db "SELECT id, name, device_id, sync_status FROM customers;"
```

### Compare Device IDs Across Tables
```bash
sqlite3 data/cleanflow.db "
SELECT 
  'customers' as table_name,
  COUNT(DISTINCT device_id) as unique_devices
FROM customers
UNION ALL
SELECT 
  'jobs' as table_name,
  COUNT(DISTINCT device_id) as unique_devices
FROM jobs;
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

---

## Troubleshooting

### App Won't Start on Second PC

**Issue:** Missing dependencies

**Solution:**
```bash
cd /path/to/cleanflow-pos
npm install
```

### Same Device ID on Both PCs

**Issue:** Database file was copied instead of generated fresh

**Solution:**
- Delete `data/cleanflow.db` on PC 2
- Restart app (new device ID will be generated)

### Records Missing device_id

**Issue:** Database migrations didn't run

**Solution:**
- Check migrations table:
  ```sql
  SELECT * FROM migrations;
  ```
- If empty, delete database and restart app

### Can't Access Database File

**Issue:** File permissions or path issues

**Solution:**
- Check file exists: `ls -la data/cleanflow.db` (Mac/Linux)
- Check permissions: `chmod 644 data/cleanflow.db` (Mac/Linux)
- On Windows, ensure you have write permissions

---

## Next Steps: Testing Sync (Future)

Once sync functionality is implemented, you can test:

1. **Upload from PC 1:** Send pending records to server
2. **Download to PC 2:** Receive records from server
3. **Verify:** PC 2 sees PC 1's records with correct device_id
4. **Idempotency:** Resend same records multiple times (should be safe)

---

*Multi-PC Testing Guide Version: 1.0*  
*Last Updated: December 2024*

