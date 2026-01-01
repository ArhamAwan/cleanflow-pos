/**
 * Sync Progress Component
 * 
 * Displays sync progress, status, and controls.
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, Cloud, CloudOff, Check, AlertCircle, Loader2, Upload, Download, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../ui/dialog';
import { SyncStatus, SyncResult } from '@/types/electron';

const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

interface SyncProgressProps {
  onSyncComplete?: (result: SyncResult) => void;
  compact?: boolean;
}

export function SyncProgress({ onSyncComplete, compact = false }: SyncProgressProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [serverUrl, setServerUrl] = useState('http://localhost:3001');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  // Fetch status periodically
  useEffect(() => {
    if (!isElectron) return;
    
    const fetchStatus = async () => {
      try {
        const result = await window.electronAPI!.sync.getStatus();
        if (result.success && result.data) {
          setStatus(result.data);
          setIsSyncing(result.data.isSyncing);
        }
      } catch (error) {
        console.error('Failed to fetch sync status:', error);
      }
    };

    const checkServer = async () => {
      try {
        const result = await window.electronAPI!.sync.checkServer();
        setServerOnline(result.success && result.data?.online);
      } catch (error) {
        setServerOnline(false);
      }
    };

    const getServerUrl = async () => {
      try {
        const result = await window.electronAPI!.sync.getServerUrl();
        if (result.success && result.data?.url) {
          setServerUrl(result.data.url);
        }
      } catch (error) {
        console.error('Failed to get server URL:', error);
      }
    };

    fetchStatus();
    checkServer();
    getServerUrl();

    const interval = setInterval(() => {
      fetchStatus();
      checkServer();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleFullSync = async () => {
    if (!isElectron || isSyncing) {
      return;
    }
    
    setIsSyncing(true);
    try {
      const result = await window.electronAPI!.sync.fullSync();
      if (result.success && result.data) {
        setLastResult(result.data);
        onSyncComplete?.(result.data);
      } else {
        setLastResult({ success: false, error: result.error } as any);
      }
    } catch (error) {
      setLastResult({ success: false, error: String(error) } as any);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpload = async () => {
    if (!isElectron || isSyncing) {
      return;
    }
    
    setIsSyncing(true);
    try {
      const result = await window.electronAPI!.sync.upload();
      if (result.success && result.data) {
        setLastResult(result.data);
        onSyncComplete?.(result.data);
      } else {
        setLastResult({ success: false, error: result.error } as any);
      }
    } catch (error) {
      setLastResult({ success: false, error: String(error) } as any);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownload = async () => {
    if (!isElectron || isSyncing) {
      return;
    }
    
    setIsSyncing(true);
    try {
      const result = await window.electronAPI!.sync.download();
      if (result.success && result.data) {
        setLastResult(result.data);
        onSyncComplete?.(result.data);
      } else {
        setLastResult({ success: false, error: result.error } as any);
      }
    } catch (error) {
      setLastResult({ success: false, error: String(error) } as any);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!isElectron) return;
    
    try {
      await window.electronAPI!.sync.setServerUrl(serverUrl);
      setSettingsOpen(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  if (!isElectron) {
    return (
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CloudOff className="h-4 w-4" />
            <span>Sync not available (web mode)</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFullSync}
          disabled={isSyncing || !serverOnline}
          className="gap-2"
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : serverOnline ? (
            <Cloud className="h-4 w-4 text-green-500" />
          ) : (
            <CloudOff className="h-4 w-4 text-red-500" />
          )}
          <span className="hidden sm:inline">
            {isSyncing ? 'Syncing...' : 'Sync'}
          </span>
        </Button>
        
        {status?.pendingRecords ? (
          <Badge variant="secondary" className="text-xs">
            {status.pendingRecords} pending
          </Badge>
        ) : null}
      </div>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {serverOnline ? (
              <Cloud className="h-5 w-5 text-green-500" />
            ) : (
              <CloudOff className="h-5 w-5 text-red-500" />
            )}
            Sync Status
          </CardTitle>
          
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card-static">
              <DialogHeader>
                <DialogTitle>Sync Settings</DialogTitle>
                <DialogDescription>
                  Configure sync server connection
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="serverUrl">Server URL</Label>
                  <Input
                    id="serverUrl"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://localhost:3001"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveSettings}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Server Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Server</span>
          <Badge variant={serverOnline ? 'default' : 'destructive'}>
            {serverOnline === null ? 'Checking...' : serverOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>

        {/* Pending Records */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Pending Records</span>
          <span className="font-medium">{status?.pendingRecords || 0}</span>
        </div>

        {/* Last Sync */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last Sync</span>
          <span className="font-medium">
            {status?.lastSyncAt 
              ? new Date(status.lastSyncAt).toLocaleTimeString() 
              : 'Never'}
          </span>
        </div>

        {/* Sync Progress */}
        {isSyncing && status?.progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Phase</span>
              <span className="font-medium capitalize">{status.progress.phase}</span>
            </div>
            <Progress value={50} className="h-2" />
          </div>
        )}

        {/* Last Result */}
        {lastResult && !isSyncing && (
          <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
            <div className="flex items-center gap-2">
              {lastResult.success ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="font-medium">
                {lastResult.success ? 'Sync completed' : 'Sync failed'}
              </span>
            </div>
            {lastResult.totalUploaded !== undefined && (
              <div className="text-muted-foreground">
                ↑ {lastResult.totalUploaded} uploaded, ↓ {lastResult.totalDownloaded} downloaded
              </div>
            )}
            {lastResult.errors && lastResult.errors.length > 0 && (
              <div className="text-red-500 text-xs">
                {lastResult.errors.length} error(s)
              </div>
            )}
          </div>
        )}

        {/* Sync Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpload}
            disabled={isSyncing || !serverOnline}
            className="gap-1"
          >
            <Upload className="h-3 w-3" />
            Upload
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isSyncing || !serverOnline}
            className="gap-1"
          >
            <Download className="h-3 w-3" />
            Download
          </Button>
          <Button
            size="sm"
            onClick={handleFullSync}
            disabled={isSyncing || !serverOnline}
            className="gap-1"
          >
            {isSyncing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Full Sync
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default SyncProgress;

