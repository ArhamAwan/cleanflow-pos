# Windows Troubleshooting Guide

Common issues and solutions when running CleanFlow POS on Windows.

## Issue 1: App Won't Start / Crashes Immediately

### Symptoms
- Double-clicking the app does nothing
- App window appears briefly then closes
- No error messages visible

### Solutions

**1. Check Windows Event Viewer**
- Press `Win + R`, type `eventvwr.msc`
- Go to Windows Logs → Application
- Look for errors related to "CleanFlow POS" or "Electron"
- Note the error message

**2. Run from Command Prompt**
- Open Command Prompt as Administrator
- Navigate to installation directory:
  ```cmd
  cd "C:\Users\<YourUsername>\AppData\Local\Programs\cleanflow-pos"
  ```
- Run the executable:
  ```cmd
  "CleanFlow POS.exe"
  ```
- Check for error messages in the console

**3. Check for Missing Dependencies**
- Install Visual C++ Redistributable:
  - Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe
  - Install and restart

**4. Check Antivirus/Windows Defender**
- Windows Defender might be blocking the app
- Add exception for CleanFlow POS
- Or temporarily disable real-time protection to test

---

## Issue 2: "Cannot find module 'better-sqlite3'"

### Symptoms
- Error: `Cannot find module 'better-sqlite3'`
- Error: `The specified module could not be found`

### Solutions

**1. Rebuild Native Module**
If building from source on Windows:
```cmd
npm rebuild better-sqlite3
```

**2. Check Build Configuration**
Ensure `better-sqlite3` is included in the build:
- Check `package.json` → `build.files`
- Should include: `"node_modules/better-sqlite3/**/*"`

**3. Verify Installation**
Check if better-sqlite3 exists:
```cmd
dir "node_modules\better-sqlite3"
```

---

## Issue 3: Database Errors

### Symptoms
- "Cannot open database"
- "SQLITE_CANTOPEN"
- "Access denied"

### Solutions

**1. Check Database Path**
The database should be at:
```
C:\Users\<YourUsername>\AppData\Roaming\cleanflow-pos\cleanflow.db
```

**2. Check Permissions**
- Right-click the `cleanflow-pos` folder in AppData\Roaming
- Properties → Security
- Ensure your user has "Full Control"

**3. Check Disk Space**
- Ensure C: drive has free space
- Database needs space to create WAL files

**4. Check if Database is Locked**
- Close all instances of the app
- Delete `cleanflow.db-shm` and `cleanflow.db-wal` if they exist
- Restart the app

---

## Issue 4: App Starts but UI is Blank

### Symptoms
- App window opens
- White/blank screen
- No UI elements visible

### Solutions

**1. Check Console for Errors**
- Open DevTools: `Ctrl + Shift + I` or `F12`
- Check Console tab for errors
- Check Network tab for failed requests

**2. Check File Paths**
- Ensure `dist/index.html` exists in installation directory
- Check that all assets are present

**3. Check URL Loading**
In DevTools Console, check:
```javascript
window.location.href
```
Should show `file:///` path, not `http://localhost`

---

## Issue 5: "electronAPI is not defined"

### Symptoms
- Console error: `window.electronAPI is not defined`
- Features don't work
- Database operations fail

### Solutions

**1. Check Preload Script**
- Verify `preload.cjs` exists in `electron/` folder
- Check that it's being loaded (check main process logs)

**2. Check Context Isolation**
- Ensure `contextIsolation: true` in main.cjs
- Ensure `nodeIntegration: false`

**3. Restart App**
- Close app completely
- Restart to reload preload script

---

## Issue 6: Path Issues

### Symptoms
- "ENOENT: no such file or directory"
- Path errors with backslashes/forward slashes

### Solutions

**1. Verify Path Handling**
The code uses `path.join()` which handles Windows paths correctly.

**2. Check Development vs Production**
- Development: `./data/cleanflow.db`
- Production: `%APPDATA%\cleanflow-pos\cleanflow.db`

**3. Manual Database Check**
```cmd
dir "%APPDATA%\cleanflow-pos"
```

---

## Issue 7: Installation Fails

### Symptoms
- Installer won't run
- "Windows protected your PC" message
- Installation wizard fails

### Solutions

**1. Unblock Installer**
- Right-click `.exe` file
- Properties → General → Unblock
- Click OK, then run installer

**2. Run as Administrator**
- Right-click installer
- "Run as administrator"

**3. Check Windows Defender**
- Temporarily disable Windows Defender
- Install app
- Re-enable Defender
- Add exception for installed app

**4. Check Installation Directory**
- Ensure you have write permissions
- Try installing to different location (e.g., `C:\Program Files\CleanFlow POS`)

---

## Issue 8: App Runs but Database Operations Fail

### Symptoms
- App starts successfully
- But creating/reading records fails
- Database errors in console

### Solutions

**1. Check Database File**
```cmd
dir "%APPDATA%\cleanflow-pos\cleanflow.db"
```
If missing, the app should create it automatically.

**2. Check Database Permissions**
- Ensure write permissions on AppData\Roaming folder
- Check if antivirus is blocking database access

**3. Check Console Logs**
- Open DevTools (F12)
- Check for database-related errors
- Look for SQLite error codes

**4. Verify Migrations Ran**
Check if migrations table exists:
```sql
-- Use SQLite browser or command line
SELECT * FROM migrations;
```

---

## Debugging Steps

### Step 1: Enable Verbose Logging

Add to `electron/main.cjs`:
```javascript
app.commandLine.appendSwitch('enable-logging');
```

### Step 2: Check Main Process Logs

Run from command line to see main process output:
```cmd
cd "C:\Users\<YourUsername>\AppData\Local\Programs\cleanflow-pos"
"CleanFlow POS.exe" --enable-logging
```

### Step 3: Check Renderer Process Logs

Open DevTools in the app (F12) and check Console.

### Step 4: Test Database Directly

Install SQLite browser and open:
```
%APPDATA%\cleanflow-pos\cleanflow.db
```

Verify:
- Tables exist
- Device ID is set
- Records can be queried

---

## Common Error Messages

### "The application was unable to start correctly (0xc000007b)"
**Solution:** Install Visual C++ Redistributable

### "Cannot find module"
**Solution:** Rebuild native modules or reinstall

### "Access is denied"
**Solution:** Run as Administrator or fix permissions

### "SQLITE_CANTOPEN"
**Solution:** Check database path and permissions

### "ENOENT"
**Solution:** Check file paths and ensure directories exist

---

## Getting Help

When reporting issues, include:

1. **Windows Version:** `Win + R` → `winver`
2. **Error Messages:** From Event Viewer or Console
3. **Steps to Reproduce:** What were you doing when it failed?
4. **Logs:** Main process and renderer process logs
5. **Database Location:** Where is the database file?
6. **Installation Method:** Installed via .exe or running from source?

---

## Quick Fixes Checklist

- [ ] Install Visual C++ Redistributable
- [ ] Run as Administrator
- [ ] Check Windows Defender/Antivirus
- [ ] Verify database path exists
- [ ] Check file permissions
- [ ] Rebuild native modules (`npm rebuild better-sqlite3`)
- [ ] Check console for errors (F12)
- [ ] Verify preload script loads
- [ ] Check disk space
- [ ] Restart computer

---

*Troubleshooting Guide Version: 1.0*  
*Last Updated: December 2024*

