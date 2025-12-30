# Fix: Same Device ID on Multiple PCs

## Problem

If you see the **same device ID** on multiple PCs, it means the database file was copied from one PC to another. Each PC must have its own unique database file.

## Why This Happens

The device ID is stored in the database file (`cleanflow.db`). If you:
- Copy the project folder (including `data/cleanflow.db`) to another PC
- Copy the database file manually
- Share the same database file

Then both PCs will have the same device ID, which breaks multi-PC functionality.

## Solution: Delete Database on PC2

### Step 1: Stop the App

Close the Electron app completely on PC2.

### Step 2: Delete the Database File

**On PC2, delete the database file:**

**Development Mode:**
```bash
# Delete the database file
rm data/cleanflow.db
rm data/cleanflow.db-shm  # If exists
rm data/cleanflow.db-wal  # If exists
```

**Windows Command Prompt:**
```cmd
cd C:\path\to\cleanflow-pos
del data\cleanflow.db
del data\cleanflow.db-shm
del data\cleanflow.db-wal
```

**Or manually:**
- Navigate to `cleanflow-pos/data/` folder
- Delete `cleanflow.db`
- Delete `cleanflow.db-shm` (if exists)
- Delete `cleanflow.db-wal` (if exists)

### Step 3: Restart the App

Restart the app on PC2. It will:
- Create a new database file
- Generate a **new unique device ID**
- Run migrations automatically

### Step 4: Verify Different Device IDs

**On PC1:**
- Dashboard → Test Database
- Note the Device ID

**On PC2:**
- Dashboard → Test Database
- Note the Device ID
- **Verify it's different from PC1**

## Correct Setup for Multiple PCs

### Method 1: Fresh Install on Each PC (Recommended)

1. **PC1:**
   - Install/build app
   - Run app → Gets Device ID #1
   - Database created automatically

2. **PC2:**
   - Install/build app **separately** (don't copy from PC1)
   - Run app → Gets Device ID #2 (different)
   - Database created automatically

### Method 2: Copy Project but NOT Database

If copying the project folder:

1. **Copy project folder** to PC2
2. **Delete database files** on PC2:
   ```bash
   rm -rf data/cleanflow.db*
   ```
3. **Run app** on PC2 → New device ID generated

### Method 3: Use Git (Best Practice)

1. **PC1:** Clone from Git, run app → Gets Device ID #1
2. **PC2:** Clone from Git separately, run app → Gets Device ID #2

**Important:** Never commit `data/cleanflow.db` to Git (add to `.gitignore`)

## Verify Device IDs Are Different

### Check via UI

1. **PC1:** Dashboard → Test Database → Note Device ID
2. **PC2:** Dashboard → Test Database → Note Device ID
3. Compare - they should be **different UUIDs**

### Check via Database

**PC1:**
```bash
sqlite3 data/cleanflow.db "SELECT value FROM app_settings WHERE key = 'device_id';"
```

**PC2:**
```bash
sqlite3 data/cleanflow.db "SELECT value FROM app_settings WHERE key = 'device_id';"
```

They should show **different UUIDs**.

## Prevention: Add Database to .gitignore

To prevent accidentally committing the database:

```bash
echo "data/cleanflow.db*" >> .gitignore
echo "*.db" >> .gitignore
echo "*.db-shm" >> .gitignore
echo "*.db-wal" >> .gitignore
```

## Testing Multi-PC Setup

After fixing device IDs:

1. **PC1:** Create a customer → Note device_id in database
2. **PC2:** Create a customer → Note device_id in database
3. **Verify:** Both customers have different device_ids matching their respective PCs

## Quick Fix Command

**On PC2 (after stopping app):**

```bash
# Delete database files
rm -f data/cleanflow.db data/cleanflow.db-shm data/cleanflow.db-wal

# Restart app - new device ID will be generated
npm run electron-dev
```

**Windows:**
```cmd
del data\cleanflow.db
del data\cleanflow.db-shm
del data\cleanflow.db-wal
```

Then restart the app.

---

*Fix Guide Version: 1.0*  
*Last Updated: December 2024*

