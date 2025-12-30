# Windows Quick Fix Guide

## If App Won't Start on Windows

### Step 1: Check Error Messages

**Run from Command Prompt:**
```cmd
cd "C:\Users\<YourUsername>\AppData\Local\Programs\cleanflow-pos"
"CleanFlow POS.exe"
```

Look for error messages in the console.

### Step 2: Common Fixes

**1. Install Visual C++ Redistributable**
- Download: https://aka.ms/vs/17/release/vc_redist.x64.exe
- Install and restart

**2. Check Windows Defender**
- Add exception for CleanFlow POS
- Or temporarily disable to test

**3. Run as Administrator**
- Right-click → Run as administrator

**4. Check Database Path**
The database should be at:
```
C:\Users\<YourUsername>\AppData\Roaming\cleanflow-pos\cleanflow.db
```

Create the folder if it doesn't exist:
```cmd
mkdir "%APPDATA%\cleanflow-pos"
```

### Step 3: Check Logs

**Windows Event Viewer:**
1. Press `Win + R`
2. Type `eventvwr.msc`
3. Go to Windows Logs → Application
4. Look for CleanFlow POS errors

### Step 4: Verify Installation

Check if these files exist:
```
C:\Users\<YourUsername>\AppData\Local\Programs\cleanflow-pos\
├── CleanFlow POS.exe
├── dist\
│   └── index.html
└── electron\
    └── main.cjs
```

### Step 5: Rebuild from Source (If Needed)

If you have the source code on Windows:

```cmd
cd C:\path\to\cleanflow-pos
npm install
npm rebuild better-sqlite3
npm run build
npm run dist:win
```

## Common Errors

### "Cannot find module 'better-sqlite3'"
**Fix:** The native module needs to be rebuilt for Windows.

### "SQLITE_CANTOPEN"
**Fix:** Check database path permissions and ensure folder exists.

### "The application was unable to start correctly"
**Fix:** Install Visual C++ Redistributable.

### Blank/White Screen
**Fix:** Check DevTools (F12) for errors, verify dist/index.html exists.

## Still Not Working?

1. Check the full troubleshooting guide: `docs/WINDOWS_TROUBLESHOOTING.md`
2. Run with logging: `"CleanFlow POS.exe" --enable-logging`
3. Check console output for specific error messages
4. Verify Windows version compatibility (Windows 10/11)

