/**
 * Dependency Queue Component
 * 
 * Displays records waiting for dependencies and allows managing the queue.
 */

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, RefreshCw, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { QueueStatus } from '@/types/electron';

const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

interface DependencyQueueProps {
  onRefresh?: () => void;
}

export function DependencyQueue({ onRefresh }: DependencyQueueProps) {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [pendingItems, setPendingItems] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchQueueData = async () => {
    if (!isElectron) return;
    
    setLoading(true);
    try {
      // Get queue status
      const statusResult = await window.electronAPI!.sync.getQueueStatus();
      if (statusResult.success && statusResult.data) {
        setQueueStatus(statusResult.data);
      }

      // Get pending items
      const pendingResult = await window.electronAPI!.sync.getQueuePending(undefined, 50);
      if (pendingResult.success && pendingResult.data) {
        setPendingItems(pendingResult.data as unknown[]);
      }
    } catch (error) {
      console.error('Failed to fetch queue data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchQueueData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleResetFailed = async () => {
    if (!isElectron) return;
    
    setIsProcessing(true);
    try {
      await window.electronAPI!.sync.resetFailedQueue();
      await fetchQueueData();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to reset failed items:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCleanup = async () => {
    if (!isElectron) return;
    
    setIsProcessing(true);
    try {
      await window.electronAPI!.sync.cleanupQueue(7);
      await fetchQueueData();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to cleanup queue:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isElectron) {
    return null;
  }

  const totalQueued = queueStatus?.totalQueued || 0;
  const failedCount = queueStatus?.byStatus?.FAILED || 0;
  const pendingCount = queueStatus?.byStatus?.PENDING || 0;

  if (totalQueued === 0 && failedCount === 0) {
    return null;
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Dependency Queue
            </CardTitle>
            <CardDescription>
              Records waiting for dependencies to sync
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={fetchQueueData}
                    disabled={loading}
                    className="h-8 w-8"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-2 rounded-lg bg-yellow-500/10">
            <div className="text-2xl font-bold text-yellow-500">
              {pendingCount}
            </div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-500/10">
            <div className="text-2xl font-bold text-blue-500">
              {queueStatus?.byStatus?.PROCESSING || 0}
            </div>
            <div className="text-xs text-muted-foreground">Processing</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-500/10">
            <div className="text-2xl font-bold text-red-500">
              {failedCount}
            </div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>

        {/* By Table Breakdown */}
        {queueStatus?.byTable && Object.keys(queueStatus.byTable).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">By Table</h4>
            <div className="space-y-1">
              {Object.entries(queueStatus.byTable).map(([table, statuses]) => (
                <div key={table} className="flex items-center justify-between text-sm">
                  <span className="font-mono">{table}</span>
                  <div className="flex gap-1">
                    {(statuses as Record<string, number>).PENDING > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {(statuses as Record<string, number>).PENDING} pending
                      </Badge>
                    )}
                    {(statuses as Record<string, number>).FAILED > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {(statuses as Record<string, number>).FAILED} failed
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Items Table */}
        {pendingItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Pending Items (showing first 10)
            </h4>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Missing</TableHead>
                    <TableHead className="text-right">Retries</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingItems.slice(0, 10).map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">
                        {item.table_name}
                      </TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[150px]">
                        {item.record_id}
                      </TableCell>
                      <TableCell>
                        {item.missingDependencies ? (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(item.missingDependencies).map(
                              ([table, ids]: [string, any]) => (
                                <Badge key={table} variant="outline" className="text-xs">
                                  {table}: {ids.length}
                                </Badge>
                              )
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.retry_count || 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Warning for failed items */}
        {failedCount > 0 && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {failedCount} items failed after max retries
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              These items could not sync due to missing dependencies. 
              Check if the required records exist on the server.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {failedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFailed}
              disabled={isProcessing}
              className="gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Failed ({failedCount})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanup}
            disabled={isProcessing}
            className="gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Cleanup Old
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default DependencyQueue;

