import { useState } from 'react';
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
import { mockCustomers, formatCurrency } from '@/data/mockData';
import { Customer } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const { toast } = useToast();

  const filteredCustomers = mockCustomers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  );

  const handleAddCustomer = () => {
    toast({
      title: 'Customer Added',
      description: `${formData.name} has been added successfully.`,
    });
    setIsAddModalOpen(false);
    setFormData({ name: '', phone: '', address: '' });
  };

  const handleEditCustomer = () => {
    toast({
      title: 'Customer Updated',
      description: `${formData.name} has been updated successfully.`,
    });
    setIsEditModalOpen(false);
    setSelectedCustomer(null);
    setFormData({ name: '', phone: '', address: '' });
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({ name: customer.name, phone: customer.phone, address: customer.address });
    setIsEditModalOpen(true);
  };

  const columns = [
    { key: 'name', header: 'Customer Name' },
    { key: 'phone', header: 'Phone' },
    { 
      key: 'outstandingBalance', 
      header: 'Outstanding Balance',
      render: (customer: Customer) => (
        <span className={customer.outstandingBalance > 0 ? 'text-destructive font-medium' : 'text-success'}>
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
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            Ledger
          </Button>
        </div>
      )
    }
  ];

  const CustomerForm = ({ onSubmit, submitText }: { onSubmit: () => void, submitText: string }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Customer Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter customer name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="Enter phone number"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Enter address"
        />
      </div>
      <DialogFooter>
        <Button onClick={onSubmit}>{submitText}</Button>
      </DialogFooter>
    </div>
  );

  return (
    <MainLayout>
      <PageHeader 
        title="Customers" 
        description="Manage your customer database"
        action={
          <Button onClick={() => setIsAddModalOpen(true)}>
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
            className="pl-9"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>Enter the customer details below.</DialogDescription>
          </DialogHeader>
          <CustomerForm onSubmit={handleAddCustomer} submitText="Add Customer" />
        </DialogContent>
      </Dialog>

      {/* Edit Customer Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update the customer details below.</DialogDescription>
          </DialogHeader>
          <CustomerForm onSubmit={handleEditCustomer} submitText="Save Changes" />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
