import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit } from 'lucide-react';
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
import { formatCurrency } from '@/data/mockData';
import { Customer } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useCustomers, useDatabaseInit } from '@/hooks/use-database';

export default function Customers() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const { toast } = useToast();

  // Database hooks
  const { isElectron } = useDatabaseInit();
  const { 
    customers: dbCustomers, 
    isLoading, 
    fetchCustomers, 
    createCustomer: dbCreateCustomer,
    updateCustomer: dbUpdateCustomer 
  } = useCustomers();

  // Fetch customers on mount
  useEffect(() => {
    if (isElectron) {
      fetchCustomers();
    }
  }, [isElectron, fetchCustomers]);

  // Use DB data only
  const customers: Customer[] = isElectron ? dbCustomers : [];

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  );

  const handleAddCustomer = async () => {
    if (!isElectron) {
      toast({
        title: 'Error',
        description: 'Database not available. Please run in Electron.',
        variant: 'destructive',
      });
      return;
    }

    const result = await dbCreateCustomer(formData);
    if (result) {
      toast({
        title: 'Customer Added',
        description: `${formData.name} has been added successfully.`,
      });
      setIsAddModalOpen(false);
      setFormData({ name: '', phone: '', address: '' });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to add customer.',
        variant: 'destructive',
      });
    }
  };

  const handleEditCustomer = async () => {
    if (!isElectron || !selectedCustomer) {
      toast({
        title: 'Error',
        description: 'Database not available. Please run in Electron.',
        variant: 'destructive',
      });
      return;
    }

    const result = await dbUpdateCustomer(selectedCustomer.id, formData);
    if (result) {
      toast({
        title: 'Customer Updated',
        description: `${formData.name} has been updated successfully.`,
      });
      setIsEditModalOpen(false);
      setSelectedCustomer(null);
      setFormData({ name: '', phone: '', address: '' });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to update customer.',
        variant: 'destructive',
      });
    }
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({ name: customer.name, phone: customer.phone, address: customer.address });
    setIsEditModalOpen(true);
  };

  const viewLedger = (customer: Customer) => {
    navigate(`/customers/${customer.id}/ledger`);
  };

  const columns = [
    { key: 'name', header: 'Customer Name' },
    { key: 'phone', header: 'Phone' },
    { 
      key: 'outstandingBalance', 
      header: 'Outstanding Balance',
      render: (customer: Customer) => (
        <span className={customer.outstandingBalance > 0 ? 'text-destructive font-semibold' : 'text-success font-semibold'}>
          {formatCurrency(customer.outstandingBalance)}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (customer: Customer) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditModal(customer)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => viewLedger(customer)} className="glass-input">
            <Eye className="h-4 w-4 mr-1" />
            Ledger
          </Button>
        </div>
      )
    }
  ];

  return (
    <MainLayout>
      <PageHeader 
        title="Customers" 
        description="Manage your customer database"
        action={
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-gradient-to-r from-primary to-secondary">
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        }
      />

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 glass-input"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredCustomers}
        keyExtractor={(customer) => customer.id}
      />

      {/* Add Customer Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="glass-card-static">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>Enter the customer details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Customer Name</Label>
              <Input
                id="add-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter customer name"
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-phone">Phone</Label>
              <Input
                id="add-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-address">Address</Label>
              <Input
                id="add-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter address"
                className="glass-input"
              />
            </div>
            <DialogFooter>
              <Button onClick={handleAddCustomer} className="bg-gradient-to-r from-primary to-secondary">Add Customer</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="glass-card-static">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update the customer details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Customer Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter customer name"
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter address"
                className="glass-input"
              />
            </div>
            <DialogFooter>
              <Button onClick={handleEditCustomer} className="bg-gradient-to-r from-primary to-secondary">Save Changes</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
