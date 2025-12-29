const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Backend initialization
const { initializeBackend, cleanupBackend } = require('./ipc/handlers.cjs');

// Keep a global reference of the window object
let mainWindow = null;

/**
 * Create the main application window
 * Security: contextIsolation enabled, nodeIntegration disabled
 */
function createWindow() {
  // Determine the URL to load based on environment
  // In development: NODE_ENV is set, or app is not packaged
  // In production: app.isPackaged will be true
  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      // Security: Enable context isolation to prevent renderer from accessing Node.js
      contextIsolation: true,
      // Security: Disable node integration in renderer process
      nodeIntegration: false,
      // Security: Preload script runs in isolated context
      preload: path.join(__dirname, 'preload.cjs'),
    },
    // Optional: Show window only when ready to prevent white flash
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  // Show window when ready to render
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    
    // Open DevTools in development (optional - remove in production)
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });
  
  if (isDev) {
    // Development: Load from Vite dev server (port 8080)
    mainWindow.loadURL('http://localhost:8080');
    
    // Auto-reload on file changes in development
    mainWindow.webContents.on('did-fail-load', () => {
      // Wait for Vite server to be ready
      setTimeout(() => {
        mainWindow?.loadURL('http://localhost:8080');
      }, 1000);
    });
  } else {
    // Production: Load from built files
    // Vite builds to 'dist' directory by default
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * IPC Handlers - Secure communication bridge
 * These handlers respond to requests from the renderer process via preload script
 */

// Handle sync-now request (placeholder for future SQLite integration)
ipcMain.handle('sync-now', async () => {
  try {
    // Future: Implement SQLite sync logic here
    return {
      success: true,
      timestamp: Date.now(),
      message: 'Sync completed (mock)',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
});

// Handle get-app-status request
ipcMain.handle('get-app-status', async () => {
  try {
    return {
      status: 'ready',
      version: app.getVersion(),
      platform: process.platform,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
    };
  }
});

/**
 * Initialize Electron app
 */
app.whenReady().then(() => {
  // Initialize SQLite backend before creating window
  const backendReady = initializeBackend();
  console.log('Backend ready:', backendReady);
  
  createWindow();

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, navigationURL) => {
    navigationEvent.preventDefault();
  });
  
  // Prevent navigation to external URLs
  contents.on('will-navigate', (event, navigationURL) => {
    const parsedURL = new URL(navigationURL);
    
    if (parsedURL.origin !== 'http://localhost:8080' && !navigationURL.startsWith('file://')) {
      event.preventDefault();
    }
  });
});

// Handle app shutdown gracefully
app.on('before-quit', () => {
  cleanupBackend();
});

