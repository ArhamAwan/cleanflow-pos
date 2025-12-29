import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Package, ToggleLeft, ToggleRight } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/data/mockData';
import { ServiceType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useServiceTypes, useDatabaseInit } from '@/hooks/use-database';

export default function ServiceCatalog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', price: '' });
  const { toast } = useToast();

  const { isElectron } = useDatabaseInit();
  const { serviceTypes: dbServiceTypes, fetchServiceTypes, createServiceType } = useServiceTypes();

  useEffect(() => {
    if (isElectron) {
      fetchServiceTypes();
    }
  }, [isElectron, fetchServiceTypes]);

  const services = isElectron ? dbServiceTypes.map(s => ({ ...s, isActive: s.isActive !== false })) : [];

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddService = async () => {
    if (!isElectron) {
      toast({
        title: 'Error',
        description: 'Database not available. Please run in Electron.',
      });
      return;
    }

    const result = await createServiceType({
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price) || 0,
    });

    if (result) {
      toast({
        title: 'Service Added',
        description: `${formData.name} has been added to the catalog.`,
      });
      setIsAddModalOpen(false);
      setFormData({ name: '', description: '', price: '' });
    }
  };

  const handleEditService = () => {
    // TODO: Implement update service type in database
    toast({
      title: 'Not Implemented',
      description: 'Service update will be available soon.',
    });
  };

  const toggleServiceStatus = (service: ServiceType & { isActive?: boolean }) => {
    // TODO: Implement toggle service status in database
    toast({
      title: 'Not Implemented',
      description: 'Service status toggle will be available soon.',
    });
  };

  const openEditModal = (service: ServiceType) => {
    setSelectedService(service);
    setFormData({ 
      name: service.name, 
      description: service.description, 
      price: service.price.toString() 
    });
    setIsEditModalOpen(true);
  };

  const columns = [
    { 
      key: 'name', 
      header: 'Service Name',
      render: (service: ServiceType & { isActive?: boolean }) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <span className={!service.isActive ? 'text-muted-foreground line-through' : ''}>
            {service.name}
          </span>
        </div>
      )
    },
    { key: 'description', header: 'Description' },
    { 
      key: 'price', 
      header: 'Price',
      render: (service: ServiceType) => (
        <span className="font-semibold text-primary">{formatCurrency(service.price)}</span>
      )
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (service: ServiceType & { isActive?: boolean }) => (
        <span className={`text-xs px-2 py-1 rounded-full ${
          service.isActive 
            ? 'bg-success/10 text-success' 
            : 'bg-muted text-muted-foreground'
        }`}>
          {service.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (service: ServiceType & { isActive?: boolean }) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditModal(service)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => toggleServiceStatus(service)}
            className={service.isActive ? 'text-warning' : 'text-success'}
          >
            {service.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
          </Button>
        </div>
      )
    }
  ];

  return (
    <MainLayout>
      <PageHeader 
        title="Service Catalog" 
        description="Manage your service offerings and pricing"
        action={
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-gradient-to-r from-primary to-secondary">
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        }
      />

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 glass-input"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredServices}
        keyExtractor={(service) => service.id}
      />

      {/* Add Service Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="glass-card-static">
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
            <DialogDescription>Create a new service for your catalog.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-service-name">Service Name</Label>
              <Input
                id="add-service-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter service name"
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-service-description">Description</Label>
              <Textarea
                id="add-service-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter service description"
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-service-price">Price (PKR)</Label>
              <Input
                id="add-service-price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="Enter price"
                className="glass-input"
              />
            </div>
            <DialogFooter>
              <Button onClick={handleAddService} className="bg-gradient-to-r from-primary to-secondary">
                Add Service
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Service Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="glass-card-static">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>Update service details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-service-name">Service Name</Label>
              <Input
                id="edit-service-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter service name"
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-service-description">Description</Label>
              <Textarea
                id="edit-service-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter service description"
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-service-price">Price (PKR)</Label>
              <Input
                id="edit-service-price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="Enter price"
                className="glass-input"
              />
            </div>
            <DialogFooter>
              <Button onClick={handleEditService} className="bg-gradient-to-r from-primary to-secondary">
                Save Changes
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
