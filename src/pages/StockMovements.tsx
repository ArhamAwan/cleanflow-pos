import { useState, useEffect } from 'react';
import { Search, Package, ArrowUp, ArrowDown, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StockTransaction, StockTransactionType } from '@/types';
import { useDatabaseInit } from '@/hooks/use-database';
import { formatCurrency } from '@/data/mockData';

export default function StockMovements() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const { isElectron } = useDatabaseInit();

  // Fetch warehouses
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

  // Fetch stock transactions
  const fetchTransactions = async () => {
    if (!isElectron || !window.electronAPI) return;

    try {
      const filters: any = {};
      if (selectedType !== 'all') {
        filters.transactionType = selectedType;
      }
      if (selectedWarehouse !== 'all') {
        filters.warehouseId = selectedWarehouse;
      }
      
      const result = await window.electronAPI.inventory.transactions.getAll(filters);
      if (result.success && result.data) {
        let filtered = result.data;
        
        if (searchQuery) {
          filtered = filtered.filter((t: StockTransaction) =>
            (t.itemName && t.itemName.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (t.referenceId && t.referenceId.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()))
          );
        }
        
        setTransactions(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  useEffect(() => {
    if (isElectron) {
      fetchWarehouses();
      fetchTransactions();
    }
  }, [isElectron, selectedType, selectedWarehouse]);

  const getTransactionIcon = (type: StockTransactionType) => {
    switch (type) {
      case 'PURCHASE':
        return <ArrowDown className="h-4 w-4 text-success" />;
      case 'SALE':
        return <ArrowUp className="h-4 w-4 text-destructive" />;
      case 'TRANSFER':
        return <ArrowLeftRight className="h-4 w-4 text-primary" />;
      case 'ADJUSTMENT':
        return <RefreshCw className="h-4 w-4 text-warning" />;
      case 'RETURN':
        return <ArrowDown className="h-4 w-4 text-info" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getTransactionColor = (type: StockTransactionType) => {
    switch (type) {
      case 'PURCHASE':
        return 'bg-success/10 text-success';
      case 'SALE':
        return 'bg-destructive/10 text-destructive';
      case 'TRANSFER':
        return 'bg-primary/10 text-primary';
      case 'ADJUSTMENT':
        return 'bg-warning/10 text-warning';
      case 'RETURN':
        return 'bg-info/10 text-info';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (!isElectron) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Stock movements are only available in Electron app</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader 
          title="Stock Movements" 
          description="Track all stock transactions and movements"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by item, reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger>
            <SelectValue placeholder="All Transaction Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="PURCHASE">Purchase</SelectItem>
            <SelectItem value="SALE">Sale</SelectItem>
            <SelectItem value="TRANSFER">Transfer</SelectItem>
            <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
            <SelectItem value="RETURN">Return</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
          <SelectTrigger>
            <SelectValue placeholder="All Warehouses" />
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

      {/* Transactions List */}
      <div className="bg-card border border-border rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-semibold text-foreground">Date</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Type</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Item</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Warehouse</th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">Quantity</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Reference</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No stock transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-4 text-sm text-foreground">
                      {new Date(transaction.createdAt || '').toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.transactionType)}
                        <span className={`text-xs px-2 py-1 rounded-full ${getTransactionColor(transaction.transactionType)}`}>
                          {transaction.transactionType}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-foreground">
                      {(transaction as any).itemName || transaction.itemId}
                    </td>
                    <td className="p-4 text-sm text-foreground">
                      {(transaction as any).warehouseName || transaction.warehouseId}
                    </td>
                    <td className="p-4 text-sm text-right font-mono text-foreground">
                      {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {transaction.referenceType && transaction.referenceId ? (
                        <span>
                          {transaction.referenceType}: {transaction.referenceId.substring(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {transaction.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}

