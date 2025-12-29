import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { expenseCategories, formatCurrency } from '@/data/mockData';
import { Expense } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useExpenses, useDatabaseInit } from '@/hooks/use-database';

export default function Expenses() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    method: 'cash' as 'cash' | 'bank',
    date: new Date().toISOString().split('T')[0],
  });
  const { toast } = useToast();

  // Database hooks
  const { isElectron } = useDatabaseInit();
  const { expenses: dbExpenses, fetchExpenses, createExpense: dbCreateExpense } = useExpenses();

  // Fetch expenses on mount
  useEffect(() => {
    if (isElectron) {
      fetchExpenses();
    }
  }, [isElectron, fetchExpenses]);

  // Use DB data only
  const expenses: Expense[] = isElectron ? dbExpenses : [];

  const filteredExpenses = expenses.filter(expense =>
    expense.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    expense.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = async () => {
    if (isElectron) {
      const result = await dbCreateExpense({
        category: formData.category,
        amount: Number(formData.amount),
        description: formData.description,
        method: formData.method,
        date: formData.date,
      });
      if (result) {
        toast({
          title: 'Expense Recorded',
          description: `Expense of ${formatCurrency(Number(formData.amount))} recorded.`,
        });
      }
    } else {
      toast({
        title: 'Expense Recorded',
        description: `Expense of ${formatCurrency(Number(formData.amount))} recorded.`,
      });
    }
    setIsModalOpen(false);
    setFormData({
      category: '',
      amount: '',
      description: '',
      method: 'cash',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const columns = [
    { key: 'id', header: 'ID' },
    { 
      key: 'category', 
      header: 'Category',
      render: (expense: Expense) => (
        <span className="px-2 py-1 bg-muted rounded text-sm font-medium">
          {expense.category}
        </span>
      )
    },
    { key: 'description', header: 'Description' },
    { key: 'date', header: 'Date' },
    { 
      key: 'method', 
      header: 'Method',
      render: (expense: Expense) => (
        <span className="text-xs uppercase text-muted-foreground">
          {expense.method}
        </span>
      )
    },
    { 
      key: 'amount', 
      header: 'Amount',
      render: (expense: Expense) => (
        <span className="text-destructive font-medium">
          {formatCurrency(expense.amount)}
        </span>
      )
    },
  ];

  return (
    <MainLayout>
      <PageHeader 
        title="Expenses" 
        description="Track and manage business expenses"
        action={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        }
      />

      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredExpenses}
        keyExtractor={(expense) => expense.id}
      />

      {/* Add Expense Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="glass-card-static">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>Record a new business expense.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (PKR)</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={formData.method} onValueChange={(v: 'cash' | 'bank') => setFormData({ ...formData, method: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit}>Add Expense</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
