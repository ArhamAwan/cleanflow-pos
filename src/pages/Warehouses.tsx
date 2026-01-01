import { useState, useEffect } from 'react';
import { Plus, Search, Warehouse as WarehouseIcon, Edit, MapPin } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
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
import { Warehouse } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useDatabaseInit } from '@/hooks/use-database';

export default function Warehouses() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    isDefault: false,
    isActive: true,
  });
  const { toast } = useToast();
  const { isElectron } = useDatabaseInit();

  // Fetch warehouses
  const fetchWarehouses = async () => {
    if (!isElectron || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.warehouses.getAll({
        isActive: undefined,
      });
      if (result.success && result.data) {
        setWarehouses(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    }
  };

  useEffect(() => {
    if (isElectron) {
      fetchWarehouses();
    }
  }, [isElectron]);

  const handleCreate = async () => {
    if (!isElectron || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.warehouses.create({
        name: formData.name,
        address: formData.address || undefined,
        isDefault: formData.isDefault,
        isActive: formData.isActive,
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Warehouse created successfully',
        });
        setIsAddModalOpen(false);
        resetForm();
        fetchWarehouses();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create warehouse',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create warehouse',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async () => {
    if (!isElectron || !window.electronAPI || !selectedWarehouse) return;

    try {
      const result = await window.electronAPI.warehouses.update(selectedWarehouse.id, {
        name: formData.name,
        address: formData.address || undefined,
        isDefault: formData.isDefault,
        isActive: formData.isActive,
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Warehouse updated successfully',
        });
        setIsEditModalOpen(false);
        setSelectedWarehouse(null);
        resetForm();
        fetchWarehouses();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update warehouse',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update warehouse',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      isDefault: false,
      isActive: true,
    });
  };

  const openEditModal = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      address: warehouse.address || '',
      isDefault: warehouse.isDefault,
      isActive: warehouse.isActive,
    });
    setIsEditModalOpen(true);
  };

  const filteredWarehouses = warehouses.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.address && w.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isElectron) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Warehouse management is only available in Electron app</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader 
          title="Warehouses" 
          description="Manage your warehouse locations"
        />
        
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Warehouse
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search warehouses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Warehouses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWarehouses.map((warehouse) => (
          <div
            key={warehouse.id}
            className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <WarehouseIcon className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">{warehouse.name}</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openEditModal(warehouse)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            
            {warehouse.address && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                <MapPin className="h-4 w-4 mt-0.5" />
                <p>{warehouse.address}</p>
              </div>
            )}
            
            <div className="flex gap-2">
              {warehouse.isDefault && (
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                  Default
                </span>
              )}
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  warehouse.isActive
                    ? 'bg-success/10 text-success'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {warehouse.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredWarehouses.length === 0 && (
        <div className="text-center py-12">
          <WarehouseIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No warehouses found</p>
          <Button onClick={() => setIsAddModalOpen(true)} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Warehouse
          </Button>
        </div>
      )}

      {/* Add Warehouse Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="glass-card-static">
          <DialogHeader>
            <DialogTitle>Add New Warehouse</DialogTitle>
            <DialogDescription>
              Create a new warehouse location
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Warehouse Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter warehouse name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter warehouse address"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isDefault" className="cursor-pointer">
                Set as default warehouse
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name}>
              Create Warehouse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Warehouse Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="glass-card-static">
          <DialogHeader>
            <DialogTitle>Edit Warehouse</DialogTitle>
            <DialogDescription>
              Update warehouse details
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Warehouse Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter warehouse name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter warehouse address"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="edit-isDefault" className="cursor-pointer">
                Set as default warehouse
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="edit-isActive" className="cursor-pointer">
                Active
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.name}>
              Update Warehouse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}


