import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, X } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/data/mockData';
import { Customer, Item, InvoiceItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useDatabaseInit } from '@/hooks/use-database';

export interface InvoiceFormData {
  customerId: string;
  date: string;
  dueDate: string;
  invoiceType: 'TAX_INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  items: InvoiceItem[];
  discountAmount: number;
  discountPercent: number;
  paymentTerms: string;
  notes: string;
}

interface InvoiceFormProps {
  initialData?: Partial<InvoiceFormData>;
  onSubmit: (data: InvoiceFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function InvoiceForm({ initialData, onSubmit, onCancel, isLoading }: InvoiceFormProps) {
  const { toast } = useToast();
  const { isElectron } = useDatabaseInit();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showItemSearch, setShowItemSearch] = useState(false);
  
  const [formData, setFormData] = useState<InvoiceFormData>({
    customerId: initialData?.customerId || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    dueDate: initialData?.dueDate || '',
    invoiceType: initialData?.invoiceType || 'TAX_INVOICE',
    items: initialData?.items || [],
    discountAmount: initialData?.discountAmount || 0,
    discountPercent: initialData?.discountPercent || 0,
    paymentTerms: initialData?.paymentTerms || '',
    notes: initialData?.notes || '',
  });

  // Fetch customers
  useEffect(() => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.customers.getAll().then((result) => {
        if (result.success && result.data) {
          setCustomers(result.data);
        }
      });
    }
  }, [isElectron]);

  // Fetch items
  useEffect(() => {
    if (isElectron && window.electronAPI && showItemSearch) {
      window.electronAPI.inventory.items.getAll({ search: searchQuery, isActive: true }).then((result) => {
        if (result.success && result.data) {
          setItems(result.data);
        }
      });
    }
  }, [isElectron, searchQuery, showItemSearch]);

  const addItem = (item: Item) => {
    const newItem: InvoiceItem = {
      id: `temp-${Date.now()}`,
      invoiceId: '',
      itemId: item.id,
      description: item.name,
      quantity: 1,
      unitPrice: item.sellingPrice,
      discountAmount: 0,
      taxRate: item.taxRate || 17,
      taxAmount: 0,
      lineTotal: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    updateItemTotals(newItem);
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    setShowItemSearch(false);
    setSearchQuery('');
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, updates: Partial<InvoiceItem>) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index], ...updates };
      updateItemTotals(item);
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const updateItemTotals = (item: InvoiceItem) => {
    const lineSubtotal = item.quantity * item.unitPrice;
    const lineAfterDiscount = lineSubtotal - item.discountAmount;
    const lineTaxAmount = (lineAfterDiscount * item.taxRate) / 100;
    item.taxAmount = lineTaxAmount;
    item.lineTotal = lineAfterDiscount + lineTaxAmount;
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;
    
    formData.items.forEach((item) => {
      const lineSubtotal = item.quantity * item.unitPrice - item.discountAmount;
      subtotal += lineSubtotal;
      totalTax += item.taxAmount;
    });
    
    let discountAmount = formData.discountAmount;
    if (formData.discountPercent > 0) {
      discountAmount = (subtotal * formData.discountPercent) / 100;
    }
    
    const finalSubtotal = subtotal - discountAmount;
    const totalAmount = finalSubtotal + totalTax;
    
    return {
      subtotal: finalSubtotal,
      discountAmount,
      taxAmount: totalTax,
      totalAmount,
    };
  };

  const totals = calculateTotals();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerId) {
      toast({
        title: 'Error',
        description: 'Please select a customer',
        variant: 'destructive',
      });
      return;
    }
    
    if (formData.items.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one item',
        variant: 'destructive',
      });
      return;
    }
    
    onSubmit({
      ...formData,
      discountAmount: totals.discountAmount,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer and Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customer">Customer *</Label>
          <Select
            value={formData.customerId}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, customerId: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="invoiceType">Invoice Type</Label>
          <Select
            value={formData.invoiceType}
            onValueChange={(value: 'TAX_INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE') =>
              setFormData((prev) => ({ ...prev, invoiceType: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TAX_INVOICE">Tax Invoice</SelectItem>
              <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
              <SelectItem value="DEBIT_NOTE">Debit Note</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
          />
        </div>
      </div>

      {/* Items Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Items *</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowItemSearch(!showItemSearch)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Item Search */}
        {showItemSearch && (
          <div className="border rounded-lg p-4 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                  onClick={() => addItem(item)}
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.sellingPrice)} / {item.unit}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No items found
                </p>
              )}
            </div>
          </div>
        )}

        {/* Items Table */}
        {formData.items.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Tax Rate</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.items.map((item, index) => (
                  <TableRow key={item.id || index}>
                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, { description: e.target.value })
                        }
                        className="border-0 p-0 h-auto"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, { quantity: parseFloat(e.target.value) || 0 })
                        }
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })
                        }
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discountAmount}
                        onChange={(e) =>
                          updateItem(index, { discountAmount: parseFloat(e.target.value) || 0 })
                        }
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.taxRate}
                        onChange={(e) =>
                          updateItem(index, { taxRate: parseFloat(e.target.value) || 0 })
                        }
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.lineTotal)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            No items added. Click "Add Item" to add items to this invoice.
          </div>
        )}
      </div>

      {/* Discount and Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="discountPercent">Discount (%)</Label>
            <Input
              id="discountPercent"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.discountPercent}
              onChange={(e) => {
                const percent = parseFloat(e.target.value) || 0;
                setFormData((prev) => ({ ...prev, discountPercent: percent, discountAmount: 0 }));
              }}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="discountAmount">Discount Amount</Label>
            <Input
              id="discountAmount"
              type="number"
              min="0"
              step="0.01"
              value={formData.discountAmount}
              onChange={(e) => {
                const amount = parseFloat(e.target.value) || 0;
                setFormData((prev) => ({ ...prev, discountAmount: amount, discountPercent: 0 }));
              }}
            />
          </div>
        </div>

        <div className="space-y-2 border rounded-lg p-4">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount:</span>
            <span className="text-destructive">-{formatCurrency(totals.discountAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax:</span>
            <span>{formatCurrency(totals.taxAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total:</span>
            <span>{formatCurrency(totals.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Notes and Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="paymentTerms">Payment Terms</Label>
          <Input
            id="paymentTerms"
            value={formData.paymentTerms}
            onChange={(e) => setFormData((prev) => ({ ...prev, paymentTerms: e.target.value }))}
            placeholder="e.g., Net 30, Due on receipt"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Input
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional notes or comments"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Invoice'}
        </Button>
      </div>
    </form>
  );
}

