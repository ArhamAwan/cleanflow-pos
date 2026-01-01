import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Database, Palette, Bell, Zap } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useDatabaseInit } from '@/hooks/use-database';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/hooks/use-settings';

export default function AppSettings() {
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { isElectron } = useDatabaseInit();
  const navigate = useNavigate();
  const { settings, updateAppearance, updateNotifications, updatePerformance } = useSettings();

  // Fetch sync server URL
  const fetchSettings = async () => {
    if (!isElectron || !window.electronAPI) return;

    setLoading(true);
    try {
      const result = await window.electronAPI.sync.getServerUrl();
      if (result.success && result.data?.url) {
        setServerUrl(result.data.url);
      }
    } catch (error) {
      console.error('Failed to fetch sync settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isElectron) {
      fetchSettings();
    }
  }, [isElectron]);

  const handleSave = async () => {
    if (!isElectron || !window.electronAPI) {
      toast({
        title: 'Error',
        description: 'Electron API not available',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const result = await window.electronAPI.sync.setServerUrl(serverUrl);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'App settings saved successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save app settings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to save app settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save app settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-8 text-muted-foreground">
          Loading app settings...
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="App Settings"
        description="Configure application preferences and sync settings"
        icon={Settings}
      />

      <div className="space-y-6">
        {/* Sync Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Sync Settings
            </CardTitle>
            <CardDescription>
              Configure data synchronization server connection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serverUrl">Sync Server URL</Label>
              <Input
                id="serverUrl"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://localhost:3001"
              />
              <p className="text-xs text-muted-foreground">
                Enter the URL of your sync server for data synchronization
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/sync')}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                View Sync Status
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance & Theme Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance & Theme
            </CardTitle>
            <CardDescription>
              Customize the look and feel of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={settings.appearance?.theme || 'system'}
                onValueChange={(value: 'light' | 'dark' | 'system') =>
                  updateAppearance({ theme: value })
                }
              >
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fontSize">Font Size</Label>
              <Select
                value={settings.appearance?.fontSize || 'medium'}
                onValueChange={(value: 'small' | 'medium' | 'large') =>
                  updateAppearance({ fontSize: value })
                }
              >
                <SelectTrigger id="fontSize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compactView">Compact View</Label>
                <p className="text-xs text-muted-foreground">
                  Reduce spacing for a denser layout
                </p>
              </div>
              <Switch
                id="compactView"
                checked={settings.appearance?.compactView || false}
                onCheckedChange={(checked) => updateAppearance({ compactView: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showAnimations">Show Animations</Label>
                <p className="text-xs text-muted-foreground">
                  Enable transitions and animations
                </p>
              </div>
              <Switch
                id="showAnimations"
                checked={settings.appearance?.showAnimations ?? true}
                onCheckedChange={(checked) => updateAppearance({ showAnimations: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications & Alerts Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications & Alerts
            </CardTitle>
            <CardDescription>
              Configure notification preferences and alert thresholds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notificationsEnabled">Enable Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Master toggle for all notifications
                </p>
              </div>
              <Switch
                id="notificationsEnabled"
                checked={settings.notifications?.enabled ?? true}
                onCheckedChange={(checked) => updateNotifications({ enabled: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lowStockThreshold">Low Stock Alert Threshold</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                min="0"
                value={settings.notifications?.lowStockThreshold || 10}
                onChange={(e) =>
                  updateNotifications({ lowStockThreshold: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Alert when stock falls below this quantity
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="paymentReminders">Payment Reminders</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified about pending payments
                </p>
              </div>
              <Switch
                id="paymentReminders"
                checked={settings.notifications?.paymentReminders ?? true}
                onCheckedChange={(checked) => updateNotifications({ paymentReminders: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="invoiceDueAlerts">Invoice Due Date Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Alert when invoices are due or overdue
                </p>
              </div>
              <Switch
                id="invoiceDueAlerts"
                checked={settings.notifications?.invoiceDueAlerts ?? true}
                onCheckedChange={(checked) => updateNotifications({ invoiceDueAlerts: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="soundEnabled">Sound Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Play sounds for notifications
                </p>
              </div>
              <Switch
                id="soundEnabled"
                checked={settings.notifications?.soundEnabled ?? true}
                onCheckedChange={(checked) => updateNotifications({ soundEnabled: checked })}
              />
            </div>

            {isElectron && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="desktopNotifications">Desktop Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Show system notifications (Electron only)
                  </p>
                </div>
                <Switch
                  id="desktopNotifications"
                  checked={settings.notifications?.desktopNotifications ?? true}
                  onCheckedChange={(checked) =>
                    updateNotifications({ desktopNotifications: checked })
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance & Behavior Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Performance & Behavior
            </CardTitle>
            <CardDescription>
              Optimize app performance and behavior settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="autoRefreshInterval">Auto-Refresh Interval (seconds)</Label>
              <Input
                id="autoRefreshInterval"
                type="number"
                min="5"
                max="300"
                value={settings.performance?.autoRefreshInterval || 30}
                onChange={(e) =>
                  updatePerformance({ autoRefreshInterval: parseInt(e.target.value) || 30 })
                }
              />
              <p className="text-xs text-muted-foreground">
                How often to automatically refresh data (5-300 seconds)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pageSize">Page Size (items per page)</Label>
              <Select
                value={String(settings.performance?.pageSize || 25)}
                onValueChange={(value) => updatePerformance({ pageSize: parseInt(value) })}
              >
                <SelectTrigger id="pageSize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Number of items to display per page in tables
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="animationsEnabled">Enable Animations</Label>
                <p className="text-xs text-muted-foreground">
                  Control all animations (shared with Appearance)
                </p>
              </div>
              <Switch
                id="animationsEnabled"
                checked={settings.performance?.animationsEnabled ?? true}
                onCheckedChange={(checked) => updatePerformance({ animationsEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="offlineMode">Offline Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Work offline without server connection
                </p>
              </div>
              <Switch
                id="offlineMode"
                checked={settings.performance?.offlineMode || false}
                onCheckedChange={(checked) => updatePerformance({ offlineMode: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cacheSizeLimit">Cache Size Limit (MB)</Label>
              <Input
                id="cacheSizeLimit"
                type="number"
                min="10"
                max="1000"
                value={settings.performance?.cacheSizeLimit || 100}
                onChange={(e) =>
                  updatePerformance({ cacheSizeLimit: parseInt(e.target.value) || 100 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum cache size in megabytes (10-1000 MB)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

