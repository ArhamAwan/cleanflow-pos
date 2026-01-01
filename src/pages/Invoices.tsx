import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Eye } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/data/mockData';
import { Invoice, InvoiceStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useDatabaseInit } from '@/hooks/use-database';
import { InvoiceViewDialog } from '@/components/invoices/InvoiceViewDialog';

const statusColors: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-gray-500',
  SENT: 'bg-blue-500',
  PAID: 'bg-green-500',
  PARTIAL: 'bg-yellow-500',
  OVERDUE: 'bg-red-500',
  CANCELLED: 'bg-gray-400',
};

export default function Invoices() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { toast } = useToast();
  const { isElectron } = useDatabaseInit();

  // Fetch invoices
  const fetchInvoices = async () => {
    if (!isElectron || !window.electronAPI) return;

    setLoading(true);
    try {
      const filters: Record<string, unknown> = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      const result = await window.electronAPI.invoices.getAll(filters);
      if (result.success && result.data) {
        // Ensure all invoices have required fields with proper type conversion
        const safeInvoices = result.data.map((invoice: any) => ({
          ...invoice,
          invoiceNumber: invoice.invoiceNumber || invoice.invoice_number || 'N/A',
          customerName: invoice.customerName || invoice.customer_name || null,
          customerId: invoice.customerId || invoice.customer_id || '',
          date: invoice.date || new Date().toISOString().split('T')[0],
          subtotal: Number(invoice.subtotal) || 0,
          taxAmount: Number(invoice.taxAmount || invoice.tax_amount) || 0,
          totalAmount: Number(invoice.totalAmount || invoice.total_amount) || 0,
          status: invoice.status || 'DRAFT',
        }));
        setInvoices(safeInvoices);
      } else {
        console.error('Failed to fetch invoices:', result);
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch invoices',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch invoices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isElectron) {
      fetchInvoices();
    }
  }, [isElectron, statusFilter]);

  // Safety check - if invoices is not an array, set it to empty array
  useEffect(() => {
    if (!Array.isArray(invoices)) {
      setInvoices([]);
    }
  }, [invoices]);

  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      invoice.invoiceNumber?.toLowerCase().includes(query) ||
      invoice.customerName?.toLowerCase().includes(query) ||
      invoice.customerId?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Invoices"
        description="Manage sales invoices and tax invoices"
        icon={FileText}
      />

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by invoice number or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => navigate('/invoices/create')}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>

        {/* Invoices Table */}
        <div className="glass-card rounded-lg p-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading invoices...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices found. Create your first invoice to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  // Safety checks for each invoice
                  if (!invoice || !invoice.id) {
                    return null;
                  }
                  
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {invoice.customerName || invoice.customerId || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {invoice.date ? formatDate(invoice.date) : '-'}
                      </TableCell>
                      <TableCell>
                        {invoice.dueDate ? formatDate(invoice.dueDate) : '-'}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(invoice.subtotal)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(invoice.taxAmount)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(invoice.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${statusColors[invoice.status as InvoiceStatus] || 'bg-gray-500'} text-white`}
                          variant="default"
                        >
                          {invoice.status || 'DRAFT'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setViewInvoiceId(invoice.id);
                              setIsViewDialogOpen(true);
                            }}
                            title="View Invoice"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Invoice View Dialog */}
      <InvoiceViewDialog
        invoiceId={viewInvoiceId}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
      />
    </MainLayout>
  );
}


