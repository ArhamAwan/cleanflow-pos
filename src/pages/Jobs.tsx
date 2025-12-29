import { useState, useRef, useEffect } from 'react';
import { Plus, Search, CreditCard, Printer } from 'lucide-react';
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
import { Job, Customer, ServiceType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { JobReceipt } from '@/components/receipts/JobReceipt';
import { useReactToPrint } from 'react-to-print';
import { useJobs, useCustomers, useServiceTypes, usePayments, useDatabaseInit } from '@/hooks/use-database';

export default function Jobs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState({
    customerId: '',
    serviceId: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  // Database hooks
  const { isElectron } = useDatabaseInit();
  const { jobs: dbJobs, fetchJobs, createJob: dbCreateJob } = useJobs();
  const { customers: dbCustomers, fetchCustomers } = useCustomers();
  const { serviceTypes: dbServiceTypes, fetchServiceTypes } = useServiceTypes();
  const { createPayment: dbCreatePayment } = usePayments();

  // Fetch data on mount
  useEffect(() => {
    if (isElectron) {
      fetchJobs();
      fetchCustomers();
      fetchServiceTypes();
    }
  }, [isElectron, fetchJobs, fetchCustomers, fetchServiceTypes]);

  // Use DB data if available, otherwise mock data
  const jobs: Job[] = isElectron && dbJobs.length > 0 ? dbJobs : mockJobs;
  const customers: Customer[] = isElectron && dbCustomers.length > 0 ? dbCustomers : mockCustomers;
  const serviceTypes: ServiceType[] = isElectron && dbServiceTypes.length > 0 ? dbServiceTypes : mockServiceTypes;

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${selectedJob?.id || 'job'}`,
  });

  const filteredJobs = jobs.filter(job =>
    job.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddJob = async () => {
    const selectedService = serviceTypes.find(s => s.id === formData.serviceId);
    
    if (isElectron && selectedService) {
      const result = await dbCreateJob({
        customerId: formData.customerId,
        serviceId: formData.serviceId,
        date: formData.date,
        amount: selectedService.price,
      });
      if (result) {
        toast({
          title: 'Job Created',
          description: 'New job has been created successfully.',
        });
      }
    } else {
      toast({
        title: 'Job Created',
        description: 'New job has been created successfully.',
      });
    }
    setIsAddModalOpen(false);
    setFormData({ customerId: '', serviceId: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleAddPayment = async () => {
    if (isElectron && selectedJob) {
      const result = await dbCreatePayment({
        type: 'cash_in',
        amount: Number(paymentAmount),
        method: paymentMethod,
        customerId: selectedJob.customerId,
        jobId: selectedJob.id,
        description: `Payment for ${selectedJob.serviceName}`,
        date: new Date().toISOString().split('T')[0],
      });
      if (result) {
        toast({
          title: 'Payment Recorded',
          description: `Payment of PKR ${paymentAmount} has been recorded.`,
        });
        fetchJobs(); // Refresh jobs to update payment status
      }
    } else {
      toast({
        title: 'Payment Recorded',
        description: `Payment of PKR ${paymentAmount} has been recorded.`,
      });
    }
    setIsPaymentModalOpen(false);
    setSelectedJob(null);
    setPaymentAmount('');
  };

  const openPaymentModal = (job: Job) => {
    setSelectedJob(job);
    setPaymentAmount((job.amount - job.paidAmount).toString());
    setIsPaymentModalOpen(true);
  };

  const openReceiptModal = (job: Job) => {
    setSelectedJob(job);
    setIsReceiptModalOpen(true);
  };

  const columns = [
    { key: 'id', header: 'Job ID' },
    { key: 'customerName', header: 'Customer' },
    { key: 'serviceName', header: 'Service' },
    { key: 'date', header: 'Date' },
    { 
      key: 'amount', 
      header: 'Amount',
      render: (job: Job) => <span className="font-semibold">{formatCurrency(job.amount)}</span>
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
            <Button variant="outline" size="sm" onClick={() => openPaymentModal(job)} className="glass-input">
              <CreditCard className="h-4 w-4 mr-1" />
              Pay
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => openReceiptModal(job)}>
            <Printer className="h-4 w-4" />
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
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-gradient-to-r from-primary to-secondary">
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
            className="pl-9 glass-input"
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
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Add New Job</DialogTitle>
            <DialogDescription>Create a new service job for a customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={formData.customerId} onValueChange={(v) => setFormData({ ...formData, customerId: v })}>
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
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
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map(service => (
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
                className="glass-input"
              />
            </div>
            <DialogFooter>
              <Button onClick={handleAddJob} className="bg-gradient-to-r from-primary to-secondary">Create Job</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="glass-card">
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
              <div className="bg-muted/30 p-4 rounded-xl space-y-2 backdrop-blur-sm">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-medium">{formatCurrency(selectedJob.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already Paid:</span>
                  <span className="font-medium text-success">{formatCurrency(selectedJob.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-border/50 pt-2">
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
                  className="glass-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v: 'cash' | 'bank') => setPaymentMethod(v)}>
                  <SelectTrigger className="glass-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={handleAddPayment} className="bg-gradient-to-r from-primary to-secondary">Record Payment</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="glass-card max-w-lg">
          <DialogHeader>
            <DialogTitle>Job Receipt</DialogTitle>
            <DialogDescription>
              Preview and print the receipt for this job.
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <>
              <div className="max-h-[60vh] overflow-auto">
                <JobReceipt ref={receiptRef} job={selectedJob} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsReceiptModalOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => handlePrint()} className="bg-gradient-to-r from-primary to-secondary">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
