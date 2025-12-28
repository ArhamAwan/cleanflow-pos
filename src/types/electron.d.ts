/**
 * TypeScript definitions for Electron API exposed via preload script
 * This ensures type safety when using window.electronAPI in React components
 */

export interface ElectronAPI {
  /**
   * Synchronize data with main process
   * Future: Will trigger SQLite sync operations
   */
  syncNow: () => Promise<{
    success: boolean;
    timestamp?: number;
    message?: string;
    error?: string;
  }>;

  /**
   * Get application status from main process
   */
  getAppStatus: () => Promise<{
    status: string;
    version?: string;
    platform?: string;
    error?: string;
  }>;

  /**
   * Platform information (os.platform())
   */
  platform: string;

  /**
   * App version from package.json
   */
  version: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

