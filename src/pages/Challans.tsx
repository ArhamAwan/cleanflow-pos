import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Eye, ArrowRight } from 'lucide-react';
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
import { DeliveryChallan, ChallanStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useDatabaseInit } from '@/hooks/use-database';
import { ChallanViewDialog } from '@/components/invoices/ChallanViewDialog';

const statusColors: Record<ChallanStatus, string> = {
  DRAFT: 'bg-gray-500',
  DELIVERED: 'bg-green-500',
  CONVERTED: 'bg-purple-500',
};

export default function Challans() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewChallanId, setViewChallanId] = useState<string | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { toast } = useToast();
  const { isElectron } = useDatabaseInit();

  // Fetch challans
  const fetchChallans = async () => {
    if (!isElectron || !window.electronAPI) return;

    setLoading(true);
    try {
      const filters: Record<string, unknown> = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      const result = await window.electronAPI.challans.getAll(filters);
      if (result.success && result.data) {
        const safeChallans = result.data.map((challan: any) => ({
          ...challan,
          challanNumber: challan.challanNumber || challan.challan_number || 'N/A',
          customerName: challan.customerName || challan.customer_name || null,
          customerId: challan.customerId || challan.customer_id || '',
          date: challan.date || new Date().toISOString().split('T')[0],
          status: challan.status || 'DRAFT',
        }));
        setChallans(safeChallans);
      } else {
        console.error('Failed to fetch challans:', result);
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch challans',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to fetch challans:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch challans',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isElectron) {
      fetchChallans();
    }
  }, [isElectron, statusFilter]);

  const filteredChallans = challans.filter((challan) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      challan.challanNumber?.toLowerCase().includes(query) ||
      challan.customerName?.toLowerCase().includes(query) ||
      challan.customerId?.toLowerCase().includes(query)
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

  const handleConvertToInvoice = async (challanId: string) => {
    if (!isElectron || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.challans.convertToInvoice(challanId);
      if (result.success && result.data) {
        toast({
          title: 'Success',
          description: `Challan converted to invoice ${result.data.invoiceNumber}`,
        });
        fetchChallans();
        navigate(`/invoices`);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to convert challan to invoice',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to convert challan:', error);
      toast({
        title: 'Error',
        description: 'Failed to convert challan to invoice',
        variant: 'destructive',
      });
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Delivery Challans"
        description="Manage delivery notes and challans"
        icon={FileText}
      />

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by challan number or customer..."
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
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="CONVERTED">Converted</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => navigate('/challans/create')}>
            <Plus className="h-4 w-4 mr-2" />
            New Challan
          </Button>
        </div>

        {/* Challans Table */}
        <div className="glass-card rounded-lg p-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading challans...</div>
          ) : filteredChallans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No challans found. Create your first challan to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Challan #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChallans.map((challan) => {
                  if (!challan || !challan.id) {
                    return null;
                  }
                  
                  return (
                    <TableRow key={challan.id}>
                      <TableCell className="font-medium">
                        {challan.challanNumber || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {challan.customerName || challan.customerId || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {challan.date ? formatDate(challan.date) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${statusColors[challan.status as ChallanStatus] || 'bg-gray-500'} text-white`}
                          variant="default"
                        >
                          {challan.status || 'DRAFT'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setViewChallanId(challan.id);
                              setIsViewDialogOpen(true);
                            }}
                            title="View Challan"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {challan.status !== 'CONVERTED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleConvertToInvoice(challan.id)}
                              title="Convert to Invoice"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          )}
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

      {/* Challan View Dialog */}
      <ChallanViewDialog
        challanId={viewChallanId}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        onConvertToInvoice={handleConvertToInvoice}
      />
    </MainLayout>
  );
}

