# Sync Testing Guide

This guide covers how to test the sync functionality between multiple PCs and the sync server.

## Prerequisites

1. **Sync Server Running**: PostgreSQL database configured and sync server running on `http://localhost:3001`
2. **Electron App**: CleanFlow POS app running
3. **Multiple Devices** (optional): For full multi-PC testing

## Quick Start Testing

### 1. Test Sync Server Health

```bash
# Check if server is running
curl http://localhost:3001/api/health

# Check database connection
curl http://localhost:3001/api/health/db

# Get server statistics
curl http://localhost:3001/api/health/stats
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-12-30T...",
  "uptime": 123.45
}
```

### 2. Test from Electron App UI

1. **Start the Electron app**:
   ```bash
   npm run electron-dev
   ```

2. **Navigate to Sync Status page**:
   - Click "Sync Status" button on Dashboard, OR
   - Go to Settings → Sync Status in sidebar (admin only)

3. **Check Server Connection**:
   - The page should show "Server: Online" if connected
   - If offline, check server URL in settings

4. **View Sync Statistics**:
   - See pending records count
   - View sync status by table
   - Check last sync time

### 3. Test Upload (Local → Server)

1. **Create some test data** in the app:
   - Create a customer
   - Create a service type
   - Create a job

2. **Go to Sync Status page** (`/sync`)

3. **Click "Upload" button**:
   - Should upload pending records to server
   - Check console for any errors

4. **Verify on server**:
   ```bash
   # Check if records were uploaded
   psql cleanflow_pos -c "SELECT COUNT(*) FROM customers WHERE sync_status = 'SYNCED';"
   ```

### 4. Test Download (Server → Local)

**Option A: Using another device**
1. Create records on Device A
2. Upload from Device A
3. Download on Device B
4. Verify records appear on Device B

**Option B: Simulate with same device**
1. Create records directly in PostgreSQL:
   ```sql
   INSERT INTO customers (id, device_id, name, phone, created_at, updated_at, sync_status)
   VALUES (
     'test-customer-123',
     'other-device-id',
     'Test Customer',
     '1234567890',
     NOW(),
     NOW(),
     'SYNCED'
   );
   ```

2. In Electron app, click "Download"
3. Check if customer appears in Customers list

### 5. Test Full Sync

1. **On Sync Status page**, click **"Full Sync"** button
2. This will:
   - Upload all pending records
   - Download all new records from other devices
   - Show progress and results

3. **Check results**:
   - See synced count
   - See downloaded count
   - Check for any errors

## Advanced Testing

### Test Dependency Resolution

1. **Create a Job without Customer**:
   ```sql
   -- This should be queued (missing customer dependency)
   INSERT INTO jobs (id, device_id, customer_id, service_id, date, amount, created_at, updated_at, sync_status)
   VALUES (
     'test-job-123',
     'your-device-id',
     'non-existent-customer',
     'non-existent-service',
     CURRENT_DATE,
     100.00,
     NOW(),
     NOW(),
     'PENDING'
   );
   ```

2. **Try to upload**:
   - Job should be queued (not synced)
   - Check Dependency Queue tab
   - Should show missing dependencies

3. **Create dependencies**:
   - Create the missing customer and service type
   - Upload them first
   - Then retry the job upload

### Test Conflict Resolution

1. **Create same record on two devices**:
   - Device A: Customer with `updated_at = '2024-01-01'`
   - Device B: Same customer with `updated_at = '2024-01-02'`

2. **Upload both**:
   - Server should accept both (different device_ids)
   - Last update wins when downloading

3. **Check conflicts**:
   ```bash
   curl http://localhost:3001/api/sync/conflicts \
     -H "X-Device-ID: your-device-id"
   ```

### Test Pagination

1. **Create many records** (1000+):
   ```sql
   -- Generate test customers
   INSERT INTO customers (id, device_id, name, created_at, updated_at, sync_status)
   SELECT 
     'customer-' || generate_series,
     'your-device-id',
     'Customer ' || generate_series,
     NOW(),
     NOW(),
     'PENDING'
   FROM generate_series(1, 1000);
   ```

2. **Upload**:
   - Should handle in batches of 500
   - Check server logs for pagination

### Test Error Handling

1. **Stop the sync server**:
   ```bash
   # Find and kill server process
   lsof -ti:3001 | xargs kill
   ```

2. **Try to sync from Electron app**:
   - Should show "Server: Offline"
   - Sync buttons should be disabled
   - Error message should appear

3. **Restart server**:
   ```bash
   cd server
   npm run dev
   ```

4. **Retry sync**:
   - Should work normally

## Testing Checklist

- [ ] Server health check works
- [ ] Database connection successful
- [ ] Upload pending records works
- [ ] Download new records works
- [ ] Full sync works (upload + download)
- [ ] Dependency queue handles missing dependencies
- [ ] Conflict resolution works (last update wins)
- [ ] Pagination works for large datasets
- [ ] Error handling works (server offline)
- [ ] Clock skew detection works
- [ ] Sync status updates correctly
- [ ] Queue status shows correctly

## Troubleshooting

### Server not connecting
- Check if server is running: `curl http://localhost:3001/api/health`
- Check server URL in Electron app settings
- Check firewall/network settings

### Records not syncing
- Check `sync_status` field in database (should be 'PENDING')
- Check server logs for errors
- Verify device_id matches
- Check for foreign key violations

### Dependencies not resolving
- Check Dependency Queue tab
- Verify dependencies exist on server
- Check sync order (Tier 1 before Tier 2, etc.)

### Native module errors
- Run `npm run rebuild` to rebuild better-sqlite3
- Check Electron version matches

## Manual API Testing

### Upload Records

```bash
curl -X POST http://localhost:3001/api/sync/upload \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "tableName": "customers",
    "records": [{
      "id": "test-123",
      "device_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Test Customer",
      "phone": "1234567890",
      "address": "123 Main St",
      "outstanding_balance": 0,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "sync_status": "PENDING"
    }]
  }'
```

### Download Records

```bash
curl "http://localhost:3001/api/sync/download?tableName=customers&limit=100" \
  -H "X-Device-ID: 550e8400-e29b-41d4-a716-446655440000"
```

### Check Dependencies

```bash
curl -X POST http://localhost:3001/api/dependencies/fetch \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "tableName": "jobs",
    "recordIds": ["job-123"]
  }'
```

## Multi-PC Testing Setup

1. **PC 1**:
   - Run sync server
   - Run Electron app
   - Create test data
   - Upload to server

2. **PC 2**:
   - Run Electron app (point to same server)
   - Download data
   - Create different data
   - Upload to server

3. **PC 1**:
   - Download new data from PC 2
   - Verify both datasets merged

## Expected Behavior

- ✅ Records sync in correct order (Tier 1 → Tier 5)
- ✅ Dependencies resolved automatically
- ✅ Conflicts resolved (last update wins)
- ✅ Large datasets handled with pagination
- ✅ Errors handled gracefully
- ✅ Queue system handles missing dependencies
- ✅ Server timestamps used for conflict resolution

