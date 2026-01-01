import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/data/mockData';
import { DeliveryChallan } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useDatabaseInit } from '@/hooks/use-database';

interface ChallanViewDialogProps {
  challanId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConvertToInvoice?: (challanId: string) => void;
}

export function ChallanViewDialog({ challanId, open, onOpenChange, onConvertToInvoice }: ChallanViewDialogProps) {
  const [challan, setChallan] = useState<DeliveryChallan | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isElectron } = useDatabaseInit();

  useEffect(() => {
    if (open && challanId && isElectron && window.electronAPI) {
      fetchChallan();
    }
  }, [open, challanId, isElectron]);

  const fetchChallan = async () => {
    if (!challanId || !isElectron || !window.electronAPI) return;

    setLoading(true);
    try {
      const result = await window.electronAPI.challans.getById(challanId);
      if (result.success && result.data) {
        setChallan(result.data);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load challan',
          variant: 'destructive',
        });
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Failed to fetch challan:', error);
      toast({
        title: 'Error',
        description: 'Failed to load challan',
        variant: 'destructive',
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const handleConvert = () => {
    if (challan && onConvertToInvoice) {
      onConvertToInvoice(challan.id);
      onOpenChange(false);
    }
  };

  if (!challan && !loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-static max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Challan Details</span>
            {challan && challan.status !== 'CONVERTED' && onConvertToInvoice && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleConvert}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Convert to Invoice
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            View challan details and items
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading challan...</div>
        ) : challan ? (
          <div className="space-y-6">
            {/* Challan Header */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Challan Information</h3>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Challan #:</span> {challan.challanNumber}</div>
                  <div><span className="font-medium">Date:</span> {formatDate(challan.date)}</div>
                  {challan.invoiceId && (
                    <div><span className="font-medium">Invoice ID:</span> {challan.invoiceId}</div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <Badge>{challan.status}</Badge>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Customer Information</h3>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Customer:</span> {challan.customerName || challan.customerId}</div>
                </div>
              </div>
            </div>

            {/* Challan Items */}
            {challan.items && challan.items.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4">Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {challan.items.map((item) => {
                      const total = Number(item.quantity) * Number(item.unitPrice);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(total)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Notes */}
            {challan.notes && (
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Notes:</span> {challan.notes}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">Challan not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

