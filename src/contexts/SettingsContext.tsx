import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppSettings } from '@/types';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  updateAppearance: (updates: Partial<AppSettings['appearance']>) => void;
  updateNotifications: (updates: Partial<AppSettings['notifications']>) => void;
  updatePerformance: (updates: Partial<AppSettings['performance']>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
  appearance: {
    theme: 'system',
    fontSize: 'medium',
    compactView: false,
    showAnimations: true,
  },
  notifications: {
    enabled: true,
    lowStockThreshold: 10,
    paymentReminders: true,
    invoiceDueAlerts: true,
    soundEnabled: true,
    desktopNotifications: true,
  },
  performance: {
    autoRefreshInterval: 30,
    pageSize: 25,
    animationsEnabled: true,
    offlineMode: false,
    cacheSizeLimit: 100,
  },
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('appSettings');
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...DEFAULT_SETTINGS, ...parsed };
        }
      } catch (error) {
        console.error('Failed to load settings from localStorage:', error);
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Apply settings to DOM
  useEffect(() => {
    const root = window.document.documentElement;

    // Apply font size
    if (settings.appearance?.fontSize) {
      root.classList.remove('font-small', 'font-medium', 'font-large');
      root.classList.add(`font-${settings.appearance.fontSize}`);
    }

    // Apply compact view
    if (settings.appearance?.compactView) {
      root.classList.add('compact-view');
    } else {
      root.classList.remove('compact-view');
    }

    // Apply animations
    const animationsEnabled = settings.appearance?.showAnimations ?? true;
    const performanceAnimations = settings.performance?.animationsEnabled ?? true;
    const shouldShowAnimations = animationsEnabled && performanceAnimations;

    if (shouldShowAnimations) {
      root.classList.remove('no-animations');
    } else {
      root.classList.add('no-animations');
    }
  }, [settings]);

  // Sync theme with localStorage (ThemeContext will read from localStorage on next render)
  useEffect(() => {
    if (settings.appearance?.theme) {
      localStorage.setItem('theme', settings.appearance.theme);
      // Force ThemeContext to update by triggering a custom event
      // ThemeContext reads from localStorage, so this will work
      const event = new CustomEvent('theme-changed', { detail: settings.appearance.theme });
      window.dispatchEvent(event);
    }
  }, [settings.appearance?.theme]);

  // Save to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem('appSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }, [settings]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const updateAppearance = (updates: Partial<AppSettings['appearance']>) => {
    setSettings((prev) => ({
      ...prev,
      appearance: { ...prev.appearance, ...updates } as AppSettings['appearance'],
    }));
  };

  const updateNotifications = (updates: Partial<AppSettings['notifications']>) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, ...updates } as AppSettings['notifications'],
    }));
  };

  const updatePerformance = (updates: Partial<AppSettings['performance']>) => {
    setSettings((prev) => ({
      ...prev,
      performance: { ...prev.performance, ...updates } as AppSettings['performance'],
    }));
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        updateAppearance,
        updateNotifications,
        updatePerformance,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

