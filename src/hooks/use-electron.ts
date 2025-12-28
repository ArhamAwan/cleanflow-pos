import { useEffect, useState } from 'react';

/**
 * Hook to detect if the app is running in Electron
 * and access the Electron API if available
 * 
 * Usage:
 * const { isElectron, electronAPI } = useElectron();
 * 
 * if (isElectron && electronAPI) {
 *   const status = await electronAPI.getAppStatus();
 * }
 */
export function useElectron() {
  const [isElectron, setIsElectron] = useState(false);
  const [electronAPI, setElectronAPI] = useState<Window['electronAPI']>(undefined);

  useEffect(() => {
    // Check if we're running in Electron
    const electron = window.electronAPI;
    if (electron) {
      setIsElectron(true);
      setElectronAPI(electron);
    }
  }, []);

  return {
    isElectron,
    electronAPI,
  };
}

