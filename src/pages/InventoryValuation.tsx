import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, RefreshCw, Download } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Item, Warehouse, InventoryValuation as InventoryValuationType, ValuationMethod } from '@/types';
import { useDatabaseInit } from '@/hooks/use-database';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/data/mockData';

export default function InventoryValuation() {
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<ValuationMethod>('FIFO');
  const [valuations, setValuations] = useState<Record<string, InventoryValuationType>>({});
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const { isElectron } = useDatabaseInit();
  const { toast } = useToast();

  useEffect(() => {
    if (isElectron) {
      fetchWarehouses();
      fetchItems();
    }
  }, [isElectron]);

  useEffect(() => {
    if (items.length > 0) {
      calculateValuations();
    }
  }, [items, selectedWarehouse, selectedMethod]);

  const fetchWarehouses = async () => {
    if (!isElectron || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.warehouses.getAll();
      if (result.success && result.data) {
        setWarehouses(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    }
  };

  const fetchItems = async () => {
    if (!isElectron || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.inventory.items.getAll({ isActive: true });
      if (result.success && result.data) {
        setItems(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch items',
        variant: 'destructive',
      });
    }
  };

  const calculateValuations = async () => {
    if (!isElectron || !window.electronAPI) return;

    setLoading(true);
    const warehouseId = selectedWarehouse === 'all' ? null : selectedWarehouse;
    const newValuations: Record<string, InventoryValuationType> = {};
    let total = 0;

    try {
      for (const item of items) {
        // Get stock levels for this item
        const stockResult = await window.electronAPI.inventory.stock.getLevels({
          itemId: item.id,
          warehouseId: warehouseId || undefined,
        });

        if (stockResult.success && stockResult.data) {
          for (const stockLevel of stockResult.data) {
            const key = `${item.id}-${stockLevel.warehouseId}`;
            
            // Use item's valuation method or selected method
            const method = item.valuationMethod || selectedMethod;
            
            const valuationResult = await window.electronAPI.inventory.valuation.calculate({
              itemId: item.id,
              variantId: stockLevel.variantId,
              warehouseId: stockLevel.warehouseId,
              method,
            });

            if (valuationResult.success && valuationResult.data) {
              newValuations[key] = valuationResult.data;
              total += valuationResult.data.totalCost;
            }
          }
        }
      }

      setValuations(newValuations);
      setTotalValue(total);
    } catch (error) {
      console.error('Failed to calculate valuations:', error);
      toast({
        title: 'Error',
        description: 'Failed to calculate inventory valuations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getValuationForItem = (itemId: string, warehouseId: string): InventoryValuationType | null => {
    const key = `${itemId}-${warehouseId}`;
    return valuations[key] || null;
  };

  if (!isElectron) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Inventory valuation is only available in Electron app</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="Inventory Valuation"
          description="View inventory value using different valuation methods"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={calculateValuations} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Warehouse</label>
          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger>
              <SelectValue placeholder="Select Warehouse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {warehouses.map((wh) => (
                <SelectItem key={wh.id} value={wh.id}>
                  {wh.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Valuation Method</label>
          <Select value={selectedMethod} onValueChange={(value) => setSelectedMethod(value as ValuationMethod)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FIFO">FIFO (First In First Out)</SelectItem>
              <SelectItem value="LIFO">LIFO (Last In First Out)</SelectItem>
              <SelectItem value="WEIGHTED_AVERAGE">Weighted Average</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Using {selectedMethod} method</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Items Valued</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(valuations).length}</div>
            <p className="text-xs text-muted-foreground mt-1">With stock on hand</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Average Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(valuations).length > 0
                ? formatCurrency(
                    Object.values(valuations).reduce(
                      (sum, v) => sum + v.averageCost,
                      0
                    ) / Object.keys(valuations).length
                  )
                : formatCurrency(0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per item</p>
          </CardContent>
        </Card>
      </div>

      {/* Valuation Table */}
      <Card>
        <CardHeader>
          <CardTitle>Item Valuations</CardTitle>
          <CardDescription>
            Detailed valuation breakdown for each item using {selectedMethod} method
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Average Cost</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span className="text-muted-foreground">Calculating valuations...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : Object.keys(valuations).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No inventory valuations found
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const stockResult = window.electronAPI?.inventory.stock.getLevels({
                    itemId: item.id,
                    warehouseId: selectedWarehouse === 'all' ? undefined : selectedWarehouse,
                  });

                  // For now, show item-level summary
                  const itemValuations = Object.entries(valuations).filter(([key]) =>
                    key.startsWith(`${item.id}-`)
                  );

                  if (itemValuations.length === 0) return null;

                  return itemValuations.map(([key, valuation]) => {
                    const warehouseId = key.split('-').slice(1).join('-');
                    const warehouse = warehouses.find((w) => w.id === warehouseId);

                    return (
                      <TableRow key={key}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.sku && (
                              <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{warehouse?.name || warehouseId}</TableCell>
                        <TableCell className="text-right">{valuation.totalQuantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(valuation.averageCost)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(valuation.totalCost)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{valuation.method}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  });
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </MainLayout>
  );
}

