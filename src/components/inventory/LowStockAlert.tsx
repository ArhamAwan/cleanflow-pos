import { useState, useEffect } from 'react';
import { AlertTriangle, Package, X, ExternalLink, Warehouse } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LowStockAlert as LowStockAlertType } from '@/types';
import { useDatabaseInit } from '@/hooks/use-database';
import { StockAdjustmentDialog } from './StockAdjustmentDialog';
import { useNavigate } from 'react-router-dom';

export function LowStockAlert() {
  const [alerts, setAlerts] = useState<LowStockAlertType[]>([]);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<LowStockAlertType | null>(null);
  const { isElectron } = useDatabaseInit();
  const navigate = useNavigate();

  const fetchAlerts = async () => {
    if (!isElectron || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.inventory.stock.getLowStock();
      if (result.success && result.data) {
        // Filter to show only unresolved alerts
        setAlerts(result.data.filter((alert: LowStockAlertType) => !alert.isResolved));
      }
    } catch (error) {
      console.error('Failed to fetch low stock alerts:', error);
    }
  };

  useEffect(() => {
    if (isElectron) {
      fetchAlerts();
      // Refresh alerts every 30 seconds
      const interval = setInterval(fetchAlerts, 30000);
      return () => clearInterval(interval);
    }
  }, [isElectron]);

  const handleAdjustStock = (alert: LowStockAlertType) => {
    setSelectedAlert(alert);
    setIsAdjustmentOpen(true);
  };

  const handleAdjustmentSuccess = () => {
    fetchAlerts();
  };

  if (!isElectron || alerts.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-warning/50 bg-warning/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <CardTitle className="text-lg">Low Stock Alerts</CardTitle>
            </div>
            <Badge variant="destructive" className="text-xs">
              {alerts.length} {alerts.length === 1 ? 'item' : 'items'}
            </Badge>
          </div>
          <CardDescription>
            Items below their minimum stock threshold
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 bg-background rounded-lg border border-warning/20 hover:border-warning/40 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Package className="h-4 w-4 text-warning flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {alert.itemName || `Item ${alert.itemId.substring(0, 8)}...`}
                    </p>
                    {alert.itemSku && (
                      <p className="text-xs text-muted-foreground">SKU: {alert.itemSku}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Current:</span> {alert.currentQuantity}
                      </p>
                      <span className="text-xs text-muted-foreground">|</span>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Threshold:</span> {alert.threshold}
                      </p>
                      {alert.reorderQuantity && alert.reorderQuantity > 0 && (
                        <>
                          <span className="text-xs text-muted-foreground">|</span>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Reorder Qty:</span> {alert.reorderQuantity}
                          </p>
                        </>
                      )}
                    </div>
                    {alert.warehouseName && (
                      <div className="flex items-center gap-1 mt-1">
                        <Warehouse className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{alert.warehouseName}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/items`)}
                    className="h-8 w-8 p-0"
                    title="View Item"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAdjustStock(alert)}
                  >
                    Adjust Stock
                  </Button>
                </div>
              </div>
            ))}
            {alerts.length > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                +{alerts.length - 5} more items with low stock
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedAlert && (
        <StockAdjustmentDialog
          open={isAdjustmentOpen}
          onOpenChange={setIsAdjustmentOpen}
          itemId={selectedAlert.itemId}
          warehouseId={selectedAlert.warehouseId}
          onSuccess={handleAdjustmentSuccess}
        />
      )}
    </>
  );
}


