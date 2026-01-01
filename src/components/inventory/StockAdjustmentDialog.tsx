import { useState, useEffect } from 'react';
import { Plus, Minus, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Item, Warehouse } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId?: string;
  warehouseId?: string;
  onSuccess?: () => void;
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  itemId,
  warehouseId,
  onSuccess,
}: StockAdjustmentDialogProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [formData, setFormData] = useState({
    itemId: itemId || '',
    warehouseId: warehouseId || '',
    adjustmentType: 'ADD' as 'ADD' | 'REMOVE' | 'SET',
    quantity: '',
    notes: '',
  });
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && window.electronAPI) {
      fetchItems();
      fetchWarehouses();
    }
  }, [open]);

  useEffect(() => {
    if (formData.itemId && formData.warehouseId && window.electronAPI) {
      fetchCurrentStock();
    } else {
      setCurrentStock(null);
    }
  }, [formData.itemId, formData.warehouseId]);

  const fetchItems = async () => {
    if (!window.electronAPI) return;
    try {
      const result = await window.electronAPI.inventory.items.getAll({ isActive: true });
      if (result.success && result.data) {
        setItems(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const fetchWarehouses = async () => {
    if (!window.electronAPI) return;
    try {
      const result = await window.electronAPI.warehouses.getAll({ isActive: true });
      if (result.success && result.data) {
        setWarehouses(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    }
  };

  const fetchCurrentStock = async () => {
    if (!window.electronAPI) return;
    try {
      const result = await window.electronAPI.inventory.stock.getLevels({
        itemId: formData.itemId,
        warehouseId: formData.warehouseId,
      });
      if (result.success && result.data && result.data.length > 0) {
        setCurrentStock(result.data[0].quantity);
      } else {
        setCurrentStock(0);
      }
    } catch (error) {
      console.error('Failed to fetch stock:', error);
      setCurrentStock(null);
    }
  };

  const handleSubmit = async () => {
    if (!window.electronAPI) return;

    if (!formData.itemId || !formData.warehouseId || !formData.quantity) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid quantity',
        variant: 'destructive',
      });
      return;
    }

    try {
      let result;
      
      if (formData.adjustmentType === 'ADD') {
        result = await window.electronAPI.inventory.stock.add({
          itemId: formData.itemId,
          warehouseId: formData.warehouseId,
          quantity,
          transaction: {
            referenceType: 'adjustment',
            notes: formData.notes || 'Stock adjustment - Add',
          },
        });
      } else if (formData.adjustmentType === 'REMOVE') {
        result = await window.electronAPI.inventory.stock.remove({
          itemId: formData.itemId,
          warehouseId: formData.warehouseId,
          quantity,
          transaction: {
            referenceType: 'adjustment',
            notes: formData.notes || 'Stock adjustment - Remove',
          },
        });
      } else {
        // SET - calculate difference
        if (currentStock === null) {
          toast({
            title: 'Error',
            description: 'Could not determine current stock',
            variant: 'destructive',
          });
          return;
        }
        const difference = quantity - currentStock;
        if (difference > 0) {
          result = await window.electronAPI.inventory.stock.add({
            itemId: formData.itemId,
            warehouseId: formData.warehouseId,
            quantity: difference,
            transaction: {
              referenceType: 'adjustment',
              notes: formData.notes || `Stock adjustment - Set to ${quantity}`,
            },
          });
        } else if (difference < 0) {
          result = await window.electronAPI.inventory.stock.remove({
            itemId: formData.itemId,
            warehouseId: formData.warehouseId,
            quantity: Math.abs(difference),
            transaction: {
              referenceType: 'adjustment',
              notes: formData.notes || `Stock adjustment - Set to ${quantity}`,
            },
          });
        } else {
          toast({
            title: 'Info',
            description: 'Stock is already at the specified quantity',
          });
          onOpenChange(false);
          return;
        }
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Stock adjusted successfully',
        });
        onOpenChange(false);
        resetForm();
        onSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to adjust stock',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to adjust stock',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      itemId: itemId || '',
      warehouseId: warehouseId || '',
      adjustmentType: 'ADD',
      quantity: '',
      notes: '',
    });
    setCurrentStock(null);
  };

  const getNewStock = () => {
    if (currentStock === null || !formData.quantity) return null;
    const qty = parseFloat(formData.quantity);
    if (isNaN(qty)) return null;

    switch (formData.adjustmentType) {
      case 'ADD':
        return currentStock + qty;
      case 'REMOVE':
        return Math.max(0, currentStock - qty);
      case 'SET':
        return qty;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-static max-w-md">
        <DialogHeader>
          <DialogTitle>Stock Adjustment</DialogTitle>
          <DialogDescription>
            Adjust stock levels for an item in a warehouse
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="adjust-item">Item *</Label>
            <Select
              value={formData.itemId}
              onValueChange={(value) => setFormData({ ...formData, itemId: value })}
            >
              <SelectTrigger id="adjust-item">
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="adjust-warehouse">Warehouse *</Label>
            <Select
              value={formData.warehouseId}
              onValueChange={(value) => setFormData({ ...formData, warehouseId: value })}
            >
              <SelectTrigger id="adjust-warehouse">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((wh) => (
                  <SelectItem key={wh.id} value={wh.id}>
                    {wh.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentStock !== null && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Current Stock:</span>
                <span className="font-semibold text-foreground">{currentStock}</span>
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="adjust-type">Adjustment Type *</Label>
            <Select
              value={formData.adjustmentType}
              onValueChange={(value) =>
                setFormData({ ...formData, adjustmentType: value as 'ADD' | 'REMOVE' | 'SET' })
              }
            >
              <SelectTrigger id="adjust-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADD">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-success" />
                    Add Stock
                  </div>
                </SelectItem>
                <SelectItem value="REMOVE">
                  <div className="flex items-center gap-2">
                    <Minus className="h-4 w-4 text-destructive" />
                    Remove Stock
                  </div>
                </SelectItem>
                <SelectItem value="SET">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Set Stock
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="adjust-quantity">
              {formData.adjustmentType === 'SET' ? 'New Quantity' : 'Quantity'} *
            </Label>
            <Input
              id="adjust-quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="0"
              min="0"
              step="0.01"
            />
            {getNewStock() !== null && (
              <p className="text-xs text-muted-foreground">
                New stock will be: <span className="font-semibold">{getNewStock()}</span>
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="adjust-notes">Notes</Label>
            <Textarea
              id="adjust-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes about this adjustment"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.itemId || !formData.warehouseId || !formData.quantity}>
            Apply Adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


