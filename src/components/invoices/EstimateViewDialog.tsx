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
import { Estimate } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useDatabaseInit } from '@/hooks/use-database';

interface EstimateViewDialogProps {
  estimateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConvertToInvoice?: (estimateId: string) => void;
}

export function EstimateViewDialog({ estimateId, open, onOpenChange, onConvertToInvoice }: EstimateViewDialogProps) {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isElectron } = useDatabaseInit();

  useEffect(() => {
    if (open && estimateId && isElectron && window.electronAPI) {
      fetchEstimate();
    }
  }, [open, estimateId, isElectron]);

  const fetchEstimate = async () => {
    if (!estimateId || !isElectron || !window.electronAPI) return;

    setLoading(true);
    try {
      const result = await window.electronAPI.estimates.getById(estimateId);
      if (result.success && result.data) {
        setEstimate(result.data);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load estimate',
          variant: 'destructive',
        });
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Failed to fetch estimate:', error);
      toast({
        title: 'Error',
        description: 'Failed to load estimate',
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
    if (estimate && onConvertToInvoice) {
      onConvertToInvoice(estimate.id);
      onOpenChange(false);
    }
  };

  if (!estimate && !loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-static max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Estimate Details</span>
            {estimate && estimate.status !== 'CONVERTED' && onConvertToInvoice && (
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
            View estimate details and items
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading estimate...</div>
        ) : estimate ? (
          <div className="space-y-6">
            {/* Estimate Header */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Estimate Information</h3>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Estimate #:</span> {estimate.estimateNumber}</div>
                  <div><span className="font-medium">Date:</span> {formatDate(estimate.date)}</div>
                  {estimate.validUntil && (
                    <div><span className="font-medium">Valid Until:</span> {formatDate(estimate.validUntil)}</div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <Badge>{estimate.status}</Badge>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Customer Information</h3>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Customer:</span> {estimate.customerName || estimate.customerId}</div>
                </div>
              </div>
            </div>

            {/* Estimate Items */}
            {estimate.items && estimate.items.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4">Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Tax Rate</TableHead>
                      <TableHead>Tax Amount</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estimate.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell>{formatCurrency(item.discountAmount)}</TableCell>
                        <TableCell>{item.taxRate}%</TableCell>
                        <TableCell>{formatCurrency(item.taxAmount)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.lineTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Estimate Totals */}
            <div className="border-t pt-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(Number(estimate.subtotal) || 0)}</span>
                  </div>
                  {(Number(estimate.discountAmount) || 0) > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Discount:</span>
                      <span>-{formatCurrency(Number(estimate.discountAmount) || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatCurrency(Number(estimate.taxAmount) || 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total:</span>
                    <span>{formatCurrency(Number(estimate.totalAmount) || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {estimate.notes && (
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Notes:</span> {estimate.notes}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">Estimate not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

