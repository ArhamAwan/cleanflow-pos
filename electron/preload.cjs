const { contextBridge, ipcRenderer } = require('electron');

/**
 * Secure preload script
 * Exposes a minimal API to the renderer process via contextBridge
 * This is the ONLY bridge between the React UI and Electron main process
 */

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Synchronize data with main process (placeholder for future SQLite integration)
   * @returns {Promise<{success: boolean, timestamp: number}>}
   */
  syncNow: async () => {
    try {
      // Future: This will trigger SQLite sync operations
      const result = await ipcRenderer.invoke('sync-now');
      return result;
    } catch (error) {
      console.error('Sync error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get application status from main process
   * @returns {Promise<{status: string, version: string}>}
   */
  getAppStatus: async () => {
    try {
      const result = await ipcRenderer.invoke('get-app-status');
      return result;
    } catch (error) {
      console.error('Status error:', error);
      return { status: 'error', error: error.message };
    }
  },

  /**
   * Platform information (useful for UI adjustments)
   */
  platform: process.platform,
  
  /**
   * App version (from package.json)
   */
  version: process.env.npm_package_version || '1.0.0',
});

// Log that preload script has loaded (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('Electron preload script loaded');
}

