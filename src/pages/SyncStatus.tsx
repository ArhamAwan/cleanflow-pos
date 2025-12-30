/**
 * Sync Status Page
 * 
 * Displays comprehensive sync status, controls, and queue management.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, Database, RefreshCw, Server, Wifi, WifiOff, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SyncProgress } from '@/components/shared/SyncProgress';
import { DependencyQueue } from '@/components/shared/DependencyQueue';
import { SyncStatus as SyncStatusType } from '@/types/electron';

const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

interface TableStats {
  PENDING: number;
  SYNCED: number;
  FAILED: number;
  TOTAL: number;
}

export function SyncStatusPage() {
  const navigate = useNavigate();
  const [deviceId, setDeviceId] = useState<string>('');
  const [syncStats, setSyncStats] = useState<Record<string, TableStats>>({});
  const [totalPending, setTotalPending] = useState(0);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!isElectron) return;

    setLoading(true);
    try {
      // Get device ID
      const deviceResult = await window.electronAPI!.test.getDeviceId();
      if (deviceResult.success && deviceResult.data?.deviceId) {
        setDeviceId(deviceResult.data.deviceId);
      }

      // Get sync stats
      const statsResult = await window.electronAPI!.test.getSyncStats();
      if (statsResult.success && statsResult.data) {
        setSyncStats(statsResult.data.stats || {});
        setTotalPending(statsResult.data.totalPending || 0);
      }

      // Check server status
      const serverResult = await window.electronAPI!.sync.checkServer();
      setServerOnline(serverResult.success && serverResult.data?.online);

      // Get server URL
      const urlResult = await window.electronAPI!.sync.getServerUrl();
      if (urlResult.success && urlResult.data?.url) {
        setServerUrl(urlResult.data.url);
      }
    } catch (error) {
      console.error('Failed to fetch sync data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const totalRecords = Object.values(syncStats).reduce(
    (sum, table) => sum + (table.TOTAL || 0),
    0
  );

  const totalSynced = Object.values(syncStats).reduce(
    (sum, table) => sum + (table.SYNCED || 0),
    0
  );

  const totalFailed = Object.values(syncStats).reduce(
    (sum, table) => sum + (table.FAILED || 0),
    0
  );

  if (!isElectron) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <WifiOff className="h-5 w-5" />
              <span>Sync features are only available in the Electron app</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Cloud className="h-8 w-8" />
              Sync Status
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage data synchronization between devices
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          onClick={fetchData}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Server</div>
              {serverOnline ? (
                <Badge className="bg-green-500">Online</Badge>
              ) : serverOnline === null ? (
                <Badge variant="secondary">Checking...</Badge>
              ) : (
                <Badge variant="destructive">Offline</Badge>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-mono truncate">{serverUrl}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Records</div>
            <div className="text-2xl font-bold mt-1">{totalRecords}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Across all tables
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Pending Sync</div>
            <div className="text-2xl font-bold mt-1 text-yellow-500">
              {totalPending}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Waiting to upload
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Device ID</div>
            <div className="text-xs font-mono mt-2 truncate" title={deviceId}>
              {deviceId || 'Loading...'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tables">Table Details</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SyncProgress onSyncComplete={fetchData} />
            <DependencyQueue onRefresh={fetchData} />
          </div>
        </TabsContent>

        <TabsContent value="tables" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Sync Statistics by Table</CardTitle>
              <CardDescription>
                Detailed sync status for each database table
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(syncStats).map(([tableName, stats]) => (
                  <div
                    key={tableName}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono font-medium">{tableName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <span className="text-green-500">●</span>
                        {stats.SYNCED} synced
                      </Badge>
                      {stats.PENDING > 0 && (
                        <Badge variant="secondary" className="gap-1">
                          <span className="text-yellow-500">●</span>
                          {stats.PENDING} pending
                        </Badge>
                      )}
                      {stats.FAILED > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <span className="text-red-500">●</span>
                          {stats.FAILED} failed
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground ml-2">
                        Total: {stats.TOTAL}
                      </span>
                    </div>
                  </div>
                ))}
                
                {Object.keys(syncStats).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No data to display. Create some records first.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <DependencyQueue onRefresh={fetchData} />
          
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Queue Information</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                The dependency queue holds records that couldn't be synced because 
                their dependencies (referenced records) don't exist yet on the server.
              </p>
              <p>
                For example, a Job record needs its referenced Customer and ServiceType 
                to exist first. If they're not on the server, the Job is queued and 
                automatically retried.
              </p>
              <p>
                <strong>Pending:</strong> Waiting for dependencies to arrive
              </p>
              <p>
                <strong>Processing:</strong> Currently being retried
              </p>
              <p>
                <strong>Failed:</strong> Exceeded retry limit (max 10 attempts)
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SyncStatusPage;

