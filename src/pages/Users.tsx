import { useState } from 'react';
import { Plus } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mockUsers } from '@/data/mockData';
import { User, UserRole } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Users() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'data_entry' as UserRole,
  });
  const { toast } = useToast();

  // Only admin can access this page
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleCreateUser = () => {
    toast({
      title: 'User Created',
      description: `${formData.name} has been created successfully.`,
    });
    setIsModalOpen(false);
    setFormData({ name: '', email: '', role: 'data_entry' });
  };

  const handleToggleStatus = (userId: string, currentStatus: boolean) => {
    toast({
      title: currentStatus ? 'User Disabled' : 'User Enabled',
      description: `User has been ${currentStatus ? 'disabled' : 'enabled'}.`,
    });
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-primary/10 text-primary',
      accountant: 'bg-accent text-accent-foreground',
      data_entry: 'bg-secondary text-secondary-foreground',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[role]}`}>
        {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    );
  };

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { 
      key: 'role', 
      header: 'Role',
      render: (u: User) => getRoleBadge(u.role)
    },
    { 
      key: 'isActive', 
      header: 'Status',
      render: (u: User) => <StatusBadge status={u.isActive ? 'active' : 'inactive'} />
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (u: User) => (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">
            {u.isActive ? 'Enabled' : 'Disabled'}
          </span>
          <Switch 
            checked={u.isActive} 
            onCheckedChange={() => handleToggleStatus(u.id, u.isActive)}
            disabled={u.id === user?.id}
          />
        </div>
      )
    }
  ];

  return (
    <MainLayout>
      <PageHeader 
        title="User Management" 
        description="Create and manage system users (Admin Only)"
        action={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={mockUsers}
        keyExtractor={(u) => u.id}
      />

      {/* Create User Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new user to the system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="data_entry">Data Entry Operator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                A temporary password will be generated and sent to the user's email.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateUser}>Create User</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
