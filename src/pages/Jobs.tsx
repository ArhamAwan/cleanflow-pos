import { useState } from 'react';
import { Plus, Search, CreditCard, FileText } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
import { mockJobs, mockCustomers, mockServiceTypes, formatCurrency } from '@/data/mockData';
import { Job } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function Jobs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState({
    customerId: '',
    serviceId: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const { toast } = useToast();

  const filteredJobs = mockJobs.filter(job =>
    job.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddJob = () => {
    toast({
      title: 'Job Created',
      description: 'New job has been created successfully.',
    });
    setIsAddModalOpen(false);
    setFormData({ customerId: '', serviceId: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleAddPayment = () => {
    toast({
      title: 'Payment Recorded',
      description: `Payment of PKR ${paymentAmount} has been recorded.`,
    });
    setIsPaymentModalOpen(false);
    setSelectedJob(null);
    setPaymentAmount('');
  };

  const openPaymentModal = (job: Job) => {
    setSelectedJob(job);
    setPaymentAmount((job.amount - job.paidAmount).toString());
    setIsPaymentModalOpen(true);
  };

  const columns = [
    { key: 'id', header: 'Job ID' },
    { key: 'customerName', header: 'Customer' },
    { key: 'serviceName', header: 'Service' },
    { key: 'date', header: 'Date' },
    { 
      key: 'amount', 
      header: 'Amount',
      render: (job: Job) => formatCurrency(job.amount)
    },
    { 
      key: 'paymentStatus', 
      header: 'Status',
      render: (job: Job) => <StatusBadge status={job.paymentStatus} />
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (job: Job) => (
        <div className="flex gap-2">
          {job.paymentStatus !== 'paid' && (
            <Button variant="outline" size="sm" onClick={() => openPaymentModal(job)}>
              <CreditCard className="h-4 w-4 mr-1" />
              Pay
            </Button>
          )}
          <Button variant="ghost" size="sm">
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <MainLayout>
      <PageHeader 
        title="Jobs / Services" 
        description="Manage service jobs and track payments"
        action={
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Job
          </Button>
        }
      />

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredJobs}
        keyExtractor={(job) => job.id}
      />

      {/* Add Job Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Job</DialogTitle>
            <DialogDescription>Create a new service job for a customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={formData.customerId} onValueChange={(v) => setFormData({ ...formData, customerId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {mockCustomers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select value={formData.serviceId} onValueChange={(v) => setFormData({ ...formData, serviceId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {mockServiceTypes.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - {formatCurrency(service.price)}
                    </SelectItem>
                  ))}
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
              <Button onClick={handleAddJob}>Create Job</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {selectedJob && (
                <>Record payment for {selectedJob.customerName} - {selectedJob.serviceName}</>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-medium">{formatCurrency(selectedJob.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already Paid:</span>
                  <span className="font-medium text-success">{formatCurrency(selectedJob.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-2">
                  <span className="text-muted-foreground">Remaining:</span>
                  <span className="font-medium text-destructive">{formatCurrency(selectedJob.amount - selectedJob.paidAmount)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Payment Amount (PKR)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select defaultValue="cash">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={handleAddPayment}>Record Payment</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
