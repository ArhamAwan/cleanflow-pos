# Building for Windows

This guide explains how to build the CleanFlow POS app for Windows.

## Prerequisites

### Option 1: Build on Windows Machine (Recommended)

- Windows 10/11 PC
- Node.js installed
- Git (optional)

### Option 2: Cross-Compile from Mac/Linux

- Mac or Linux machine
- Wine installed (for Windows builds)
- Node.js installed

**Install Wine on Mac:**
```bash
brew install wine-stable
```

**Install Wine on Linux:**
```bash
sudo apt-get install wine  # Ubuntu/Debian
# or
sudo dnf install wine      # Fedora
```

## Build Steps

### Step 1: Install Dependencies

```bash
cd /path/to/cleanflow-pos
npm install
```

### Step 2: Build React App

```bash
npm run build
```

This creates the `dist/` folder with the compiled React app.

### Step 3: Build Windows Installer

**From Windows:**
```bash
npm run dist:win
```

**From Mac/Linux (cross-compile):**
```bash
npm run dist:win
```

**Note:** If cross-compiling fails, you may need to install Wine or build on a Windows machine.

### Step 4: Find the Installer

After building, the Windows installer will be in:
```
release/CleanFlow POS Setup 1.0.0.exe
```

## Build Output

The build process creates:

- **NSIS Installer**: `release/CleanFlow POS Setup 1.0.0.exe`
  - Standard Windows installer
  - Allows custom installation directory
  - Creates Start Menu shortcuts
  - Adds uninstaller

## Installation on Windows

1. Copy `CleanFlow POS Setup 1.0.0.exe` to a Windows PC
2. Double-click the installer
3. Follow the installation wizard
4. Launch "CleanFlow POS" from Start Menu

## Database Location on Windows

After installation, the database is stored at:
```
C:\Users\<YourUsername>\AppData\Roaming\cleanflow-pos\cleanflow.db
```

## Troubleshooting

### Build Fails: "Wine is not installed"

**Solution:** Install Wine or build on a Windows machine.

```bash
# Mac
brew install wine-stable

# Linux
sudo apt-get install wine
```

### Build Fails: "better-sqlite3 rebuild failed"

**Solution:** The native module needs to be rebuilt for Windows.

```bash
npm rebuild better-sqlite3
npm run dist:win
```

### Installer Won't Run on Windows

**Solution:** 
- Right-click → Properties → Unblock (if downloaded from internet)
- Run as Administrator
- Check Windows Defender isn't blocking it

### App Won't Start After Installation

**Solution:**
- Check Windows Event Viewer for errors
- Ensure all dependencies are installed
- Try running from command line to see errors:
  ```
  cd "C:\Users\<YourUsername>\AppData\Local\Programs\cleanflow-pos"
  "CleanFlow POS.exe"
  ```

## Build Configuration

The Windows build is configured in `package.json`:

```json
"win": {
  "target": [
    {
      "target": "nsis",
      "arch": ["x64"]
    }
  ],
  "icon": "build/icon.ico"
}
```

### Available Windows Targets

- **nsis**: Standard Windows installer (default)
- **portable**: Portable .exe (no installer)
- **zip**: ZIP archive
- **squirrel**: Squirrel.Windows installer

To change the target, modify `package.json`:

```json
"win": {
  "target": "portable"  // Creates portable .exe
}
```

## Adding Windows Icon

1. Create `build/icon.ico` (256x256 or 512x512 PNG converted to ICO)
2. Use an online converter or ImageMagick:
   ```bash
   convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
   ```
3. Place in `build/icon.ico`
4. Rebuild: `npm run dist:win`

## Testing the Windows Build

### On Windows Machine

1. Install the `.exe` file
2. Launch the app
3. Verify:
   - App starts correctly
   - Database is created in AppData
   - Device ID is generated
   - Can create records
   - All features work

### Multi-PC Testing

1. Install on PC 1 → Note Device ID
2. Install on PC 2 → Note Device ID (should be different)
3. Create records on each PC
4. Verify device_ids are correct

## Build Scripts Reference

- `npm run dist:win` - Build for Windows
- `npm run dist:mac` - Build for Mac
- `npm run dist:linux` - Build for Linux
- `npm run dist` - Build for current platform

## Distribution

### For Internal Use

- Copy installer to shared drive
- Email installer to users
- Use USB drive

### For Public Distribution

- Code sign the installer (requires certificate)
- Upload to file hosting
- Create download page

## Code Signing (Optional)

To sign the Windows installer:

1. Obtain a code signing certificate
2. Add to `package.json`:
   ```json
   "win": {
     "certificateFile": "path/to/certificate.pfx",
     "certificatePassword": "password"
   }
   ```

## File Size

Expected installer size: ~150-200 MB
- Includes Electron runtime
- Includes all dependencies
- Includes better-sqlite3 native module

---

*Build Guide Version: 1.0*  
*Last Updated: December 2024*

