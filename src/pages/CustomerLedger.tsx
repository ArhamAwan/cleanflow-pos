import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Download } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { exportToExcel } from '@/lib/exportUtils';
import { useCustomers, useJobs, usePayments, useDatabaseInit } from '@/hooks/use-database';
import { useEffect } from 'react';

interface CustomerTransaction {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function CustomerLedger() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [dateFrom, setDateFrom] = useState('2024-12-01');
  const [dateTo, setDateTo] = useState('2024-12-31');

  const { isElectron } = useDatabaseInit();
  const { customers: dbCustomers, fetchCustomers } = useCustomers();
  const { jobs: dbJobs, fetchJobs } = useJobs();
  const { payments: dbPayments, fetchPayments } = usePayments();

  useEffect(() => {
    if (isElectron) {
      fetchCustomers();
      fetchJobs({ customerId });
      fetchPayments({ customerId });
    }
  }, [isElectron, customerId, fetchCustomers, fetchJobs, fetchPayments]);

  const customer = isElectron ? dbCustomers.find(c => c.id === customerId) : null;

  if (!customer) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Customer not found</p>
          <Button variant="outline" onClick={() => navigate('/customers')} className="mt-4">
            Back to Customers
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Generate ledger entries from jobs and payments
  const customerJobs = isElectron ? dbJobs.filter(j => j.customerId === customerId) : [];
  const customerPayments = isElectron ? dbPayments.filter(p => p.customerId === customerId) : [];

  let runningBalance = 0;
  const transactions: CustomerTransaction[] = [];

  // Add jobs as debits (customer owes)
  customerJobs.forEach(job => {
    runningBalance += job.amount;
    transactions.push({
      id: `job-${job.id}`,
      date: job.date,
      description: `${job.serviceName} - ${job.id}`,
      debit: job.amount,
      credit: 0,
      balance: runningBalance,
    });
  });

  // Add payments as credits (customer paid)
  customerPayments.forEach(payment => {
    runningBalance -= payment.amount;
    transactions.push({
      id: `pay-${payment.id}`,
      date: payment.date,
      description: `Payment - ${payment.method.toUpperCase()}`,
      debit: 0,
      credit: payment.amount,
      balance: runningBalance,
    });
  });

  // Sort by date and recalculate running balance
  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let balance = 0;
  transactions.forEach(t => {
    balance = balance + t.debit - t.credit;
    t.balance = balance;
  });

  // Filter by date range
  const filteredTransactions = transactions.filter(t => 
    t.date >= dateFrom && t.date <= dateTo
  );

  const handleExport = () => {
    exportToExcel(
      filteredTransactions.map(t => ({
        Date: t.date,
        Description: t.description,
        Debit: t.debit || '',
        Credit: t.credit || '',
        Balance: t.balance,
      })),
      `${customer.name.replace(/\s+/g, '_')}_Ledger`
    );
    toast({
      title: 'Export Complete',
      description: 'Ledger has been exported to Excel.',
    });
  };

  const columns = [
    { key: 'date', header: 'Date' },
    { key: 'description', header: 'Description' },
    { 
      key: 'debit', 
      header: 'Debit (Receivable)',
      render: (t: CustomerTransaction) => t.debit ? (
        <span className="text-destructive font-medium">{formatCurrency(t.debit)}</span>
      ) : '-'
    },
    { 
      key: 'credit', 
      header: 'Credit (Received)',
      render: (t: CustomerTransaction) => t.credit ? (
        <span className="text-success font-medium">{formatCurrency(t.credit)}</span>
      ) : '-'
    },
    { 
      key: 'balance', 
      header: 'Balance',
      render: (t: CustomerTransaction) => (
        <span className={t.balance > 0 ? 'text-destructive font-semibold' : 'text-success font-semibold'}>
          {formatCurrency(t.balance)}
        </span>
      )
    },
  ];

  const finalBalance = filteredTransactions.length > 0 
    ? filteredTransactions[filteredTransactions.length - 1].balance 
    : 0;

  return (
    <MainLayout>
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate('/customers')} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
      </div>

      <PageHeader 
        title={`${customer.name} - Ledger`}
        description={`Phone: ${customer.phone} | Address: ${customer.address}`}
        action={
          <Button onClick={handleExport} className="bg-gradient-to-r from-primary to-secondary">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        }
      />

      {/* Date Range Filters */}
      <div className="mb-6 glass-card rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Date Range:</span>
          </div>
          <div className="space-y-1">
            <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">From</Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40 glass-input"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dateTo" className="text-xs text-muted-foreground">To</Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40 glass-input"
            />
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="mb-6 glass-card rounded-xl p-6">
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="text-sm text-muted-foreground">Total Billed</p>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(filteredTransactions.reduce((sum, t) => sum + t.debit, 0))}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Received</p>
            <p className="text-xl font-bold text-success">
              {formatCurrency(filteredTransactions.reduce((sum, t) => sum + t.credit, 0))}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Outstanding Balance</p>
            <p className={`text-xl font-bold ${finalBalance > 0 ? 'text-destructive' : 'text-success'}`}>
              {formatCurrency(finalBalance)}
            </p>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredTransactions}
        keyExtractor={(t) => t.id}
      />
    </MainLayout>
  );
}
