import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SyncStats {
  [table: string]: {
    PENDING: number;
    SYNCED: number;
    FAILED: number;
    TOTAL: number;
  };
}

export default function TestDatabase() {
  const [deviceId, setDeviceId] = useState<string>('');
  const [syncStats, setSyncStats] = useState<SyncStats>({});
  const [totalPending, setTotalPending] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isElectron, setIsElectron] = useState<boolean>(false);
  const [apiReady, setApiReady] = useState<boolean>(false);

  // Check if Electron API is available
  useEffect(() => {
    const checkElectron = () => {
      const hasElectron = typeof window !== 'undefined' && !!window.electronAPI;
      setIsElectron(hasElectron);
      
      if (hasElectron) {
        // Debug: Log what's available
        console.log('electronAPI available:', window.electronAPI);
        console.log('Available APIs:', Object.keys(window.electronAPI || {}));
        console.log('test API:', window.electronAPI.test);
        
        // Check if test API exists
        const hasTestAPI = window.electronAPI.test !== undefined;
        setApiReady(hasTestAPI);
        
        if (!hasTestAPI) {
          console.warn('electronAPI.test is not available. Available APIs:', Object.keys(window.electronAPI || {}));
          setError('Test API not found. Available: ' + Object.keys(window.electronAPI || {}).join(', '));
        }
      } else {
        console.log('window.electronAPI not found');
        setError('Electron API not detected. Make sure preload script is loaded.');
      }
    };

    // Check immediately
    checkElectron();

    // Also check after delays in case preload script loads late
    const timeout1 = setTimeout(checkElectron, 500);
    const timeout2 = setTimeout(checkElectron, 1000);
    const timeout3 = setTimeout(checkElectron, 2000);
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Check if electronAPI is available
      if (!window.electronAPI) {
        setError('Electron API not available. Make sure you are running in Electron.');
        setLoading(false);
        return;
      }

      if (!window.electronAPI.test) {
        setError('Test API not available. Available APIs: ' + Object.keys(window.electronAPI).join(', '));
        setLoading(false);
        return;
      }

      // Get device ID
      const deviceResult = await window.electronAPI.test.getDeviceId();
      if (deviceResult.success && deviceResult.data) {
        setDeviceId(deviceResult.data.deviceId);
      } else {
        setError(`Device ID error: ${deviceResult.error || 'Unknown error'}`);
      }

      // Get sync stats
      const statsResult = await window.electronAPI.test.getSyncStats();
      if (statsResult.success && statsResult.data) {
        setSyncStats(statsResult.data.stats);
        setTotalPending(statsResult.data.totalPending);
      } else {
        setError(`Sync stats error: ${statsResult.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiReady) {
      loadData();
    }
  }, [apiReady]);

  const tableNames = [
    'customers',
    'jobs',
    'payments',
    'expenses',
    'service_types',
    'users',
    'ledger_entries',
    'audit_logs',
  ];

  // Show loading or error state
  if (!isElectron) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              Electron API not detected. Make sure you are running the app using{' '}
              <code className="bg-muted px-1 rounded">npm run electron-dev</code>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Check the browser console (F12) for more details.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!apiReady) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Waiting for Electron API to load...
            </p>
            {error && (
              <p className="text-destructive mt-2 text-sm">
                Error: {error}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Available APIs: {window.electronAPI ? Object.keys(window.electronAPI).join(', ') : 'none'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Test & Sync Status</h1>
          <p className="text-muted-foreground mt-2">
            View device ID, sync statistics, and pending records
          </p>
        </div>
        <Button onClick={loadData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Device ID Card */}
      <Card>
        <CardHeader>
          <CardTitle>Device ID</CardTitle>
          <CardDescription>
            Unique identifier for this PC. Never changes once set.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deviceId ? (
            <div className="space-y-2">
              <code className="block p-3 bg-muted rounded-md text-sm break-all">
                {deviceId}
              </code>
              <p className="text-sm text-muted-foreground">
                Format: UUID v4 • Generated on first run • Stored in app_settings table
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">Loading device ID...</p>
          )}
        </CardContent>
      </Card>

      {/* Sync Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Statistics</CardTitle>
          <CardDescription>
            Overview of sync status across all tables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Total Pending:</span>
                <Badge variant="outline" className="ml-2">
                  {totalPending}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {tableNames.map((table) => {
              const stats = syncStats[table];
              if (!stats || stats.TOTAL === 0) return null;

              return (
                <div key={table} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 capitalize">{table.replace('_', ' ')}</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Pending</div>
                      <Badge variant="outline" className="mt-1">
                        {stats.PENDING}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Synced</div>
                      <Badge variant="outline" className="mt-1 bg-green-500/10 text-green-700 dark:text-green-400">
                        {stats.SYNCED}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                      <Badge variant="outline" className="mt-1 bg-red-500/10 text-red-700 dark:text-red-400">
                        {stats.FAILED}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total</div>
                      <Badge variant="outline" className="mt-1">
                        {stats.TOTAL}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {Object.keys(syncStats).length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No data found. Create some records to see sync statistics.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Console Logs:</strong> Device ID logs appear in the terminal where you ran{' '}
            <code className="bg-muted px-1 rounded">npm run electron-dev</code>, not in the browser console.
          </p>
          <p>
            <strong>Sync Status:</strong> All new records start as <code className="bg-muted px-1 rounded">PENDING</code>.
            After successful sync, they become <code className="bg-muted px-1 rounded">SYNCED</code>.
            Failed syncs are marked as <code className="bg-muted px-1 rounded">FAILED</code>.
          </p>
          <p>
            <strong>Device ID:</strong> This UUID identifies your PC. It's generated once and never changes.
            Every record includes this device_id to enable safe multi-PC synchronization.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

