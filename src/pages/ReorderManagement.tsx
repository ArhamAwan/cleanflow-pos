import { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingUp, RefreshCw, CheckCircle2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ItemNeedingReorder, ReorderSuggestion, Warehouse } from '@/types';
import { useDatabaseInit } from '@/hooks/use-database';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/data/mockData';

export default function ReorderManagement() {
  const [itemsNeedingReorder, setItemsNeedingReorder] = useState<ItemNeedingReorder[]>([]);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemNeedingReorder | null>(null);
  const [reorderPoint, setReorderPoint] = useState('');
  const [reorderQuantity, setReorderQuantity] = useState('');
  const { isElectron } = useDatabaseInit();
  const { toast } = useToast();

  useEffect(() => {
    if (isElectron) {
      fetchWarehouses();
      fetchData();
    }
  }, [isElectron, selectedWarehouse]);

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

  const fetchData = async () => {
    if (!isElectron || !window.electronAPI) return;

    try {
      const warehouseId = selectedWarehouse === 'all' ? null : selectedWarehouse;
      
      const [itemsResult, suggestionsResult] = await Promise.all([
        window.electronAPI.inventory.stock.getItemsNeedingReorder(warehouseId),
        window.electronAPI.inventory.stock.getReorderSuggestions(warehouseId),
      ]);

      if (itemsResult.success && itemsResult.data) {
        setItemsNeedingReorder(itemsResult.data);
      }

      if (suggestionsResult.success && suggestionsResult.data) {
        setReorderSuggestions(suggestionsResult.data);
      }
    } catch (error) {
      console.error('Failed to fetch reorder data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch reorder data',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateReorderPoint = async () => {
    if (!isElectron || !window.electronAPI || !selectedItem) return;

    try {
      const result = await window.electronAPI.inventory.stock.updateReorderPoint({
        itemId: selectedItem.itemId,
        variantId: selectedItem.variantId,
        warehouseId: selectedItem.warehouseId,
        reorderPoint: parseFloat(reorderPoint) || 0,
        reorderQuantity: parseFloat(reorderQuantity) || 0,
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Reorder point updated successfully',
        });
        setIsUpdateDialogOpen(false);
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update reorder point',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to update reorder point:', error);
      toast({
        title: 'Error',
        description: 'Failed to update reorder point',
        variant: 'destructive',
      });
    }
  };

  const openUpdateDialog = (item: ItemNeedingReorder) => {
    setSelectedItem(item);
    setReorderPoint(item.reorderPoint.toString());
    setReorderQuantity(item.reorderQuantity.toString());
    setIsUpdateDialogOpen(true);
  };

  const applySuggestion = async (suggestion: ReorderSuggestion) => {
    if (!isElectron || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.inventory.stock.updateReorderPoint({
        itemId: suggestion.itemId,
        variantId: suggestion.variantId,
        warehouseId: suggestion.warehouseId,
        reorderPoint: suggestion.reorderPoint,
        reorderQuantity: suggestion.suggestedReorderQuantity,
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Reorder suggestion applied successfully',
        });
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to apply suggestion',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply suggestion',
        variant: 'destructive',
      });
    }
  };

  if (!isElectron) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Reorder management is only available in Electron app</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="Reorder Management"
          description="Manage reorder points and get suggestions for inventory replenishment"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Warehouse Filter */}
      <div className="mb-6">
        <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
          <SelectTrigger className="w-[250px]">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Items Needing Reorder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{itemsNeedingReorder.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Below reorder point</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Reorder Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reorderSuggestions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Based on sales history</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Shortfall</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {itemsNeedingReorder.reduce((sum, item) => sum + item.shortfall, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Units needed</p>
          </CardContent>
        </Card>
      </div>

      {/* Items Needing Reorder */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Items Needing Reorder</CardTitle>
          <CardDescription>Items that have fallen below their reorder point</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Reorder Point</TableHead>
                <TableHead className="text-right">Reorder Qty</TableHead>
                <TableHead className="text-right">Shortfall</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsNeedingReorder.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No items need reordering
                  </TableCell>
                </TableRow>
              ) : (
                itemsNeedingReorder.map((item) => (
                  <TableRow key={`${item.itemId}-${item.warehouseId}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.itemName}</p>
                        {item.itemSku && (
                          <p className="text-xs text-muted-foreground">SKU: {item.itemSku}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.warehouseName}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={item.currentQuantity <= 0 ? 'destructive' : 'secondary'}>
                        {item.currentQuantity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{item.reorderPoint}</TableCell>
                    <TableCell className="text-right">{item.reorderQuantity}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-warning">
                        {item.shortfall}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openUpdateDialog(item)}
                      >
                        Update
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reorder Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle>Reorder Suggestions</CardTitle>
          <CardDescription>
            AI-powered suggestions based on sales history and current stock levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Avg Monthly Sales</TableHead>
                <TableHead className="text-right">Current Reorder Qty</TableHead>
                <TableHead className="text-right">Suggested Qty</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reorderSuggestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No reorder suggestions available
                  </TableCell>
                </TableRow>
              ) : (
                reorderSuggestions.map((suggestion) => (
                  <TableRow key={`${suggestion.itemId}-${suggestion.warehouseId}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{suggestion.itemName}</p>
                        {suggestion.itemSku && (
                          <p className="text-xs text-muted-foreground">SKU: {suggestion.itemSku}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{suggestion.warehouseName}</TableCell>
                    <TableCell className="text-right">{suggestion.currentQuantity}</TableCell>
                    <TableCell className="text-right">
                      {suggestion.avgMonthlySales.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">{suggestion.currentReorderQuantity}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-primary">
                        {suggestion.suggestedReorderQuantity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => applySuggestion(suggestion)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Apply
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Update Reorder Point Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Reorder Point</DialogTitle>
            <DialogDescription>
              Set the reorder point and quantity for {selectedItem?.itemName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reorderPoint">Reorder Point</Label>
              <Input
                id="reorderPoint"
                type="number"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Stock level at which reorder should be triggered
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reorderQuantity">Reorder Quantity</Label>
              <Input
                id="reorderQuantity"
                type="number"
                value={reorderQuantity}
                onChange={(e) => setReorderQuantity(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Quantity to order when reorder point is reached
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateReorderPoint}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

