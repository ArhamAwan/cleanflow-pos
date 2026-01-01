import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { InvoiceForm, InvoiceFormData } from '@/components/invoices/InvoiceForm';
import { useToast } from '@/hooks/use-toast';
import { useDatabaseInit } from '@/hooks/use-database';

export default function CreateInvoice() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isElectron } = useDatabaseInit();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: InvoiceFormData) => {
    if (!isElectron || !window.electronAPI) {
      toast({
        title: 'Error',
        description: 'Electron API not available',
        variant: 'destructive',
      });
      return;
    }

    // Validate data
    if (!data.customerId) {
      toast({
        title: 'Error',
        description: 'Please select a customer',
        variant: 'destructive',
      });
      return;
    }

    if (!data.items || data.items.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one item',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Prepare invoice data for the service
      // The service will calculate tax_amount and line_total
      const invoiceData = {
        invoice_type: data.invoiceType,
        customer_id: data.customerId,
        date: data.date,
        due_date: data.dueDate || null,
        items: data.items.map((item) => ({
          item_id: item.itemId || null,
          variant_id: null,
          description: item.description || 'Item',
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unitPrice) || 0,
          discount_amount: Number(item.discountAmount) || 0,
          tax_rate: Number(item.taxRate) || 17,
        })),
        discount_amount: Number(data.discountAmount) || 0,
        discount_percent: Number(data.discountPercent) || 0,
        payment_terms: data.paymentTerms || null,
        notes: data.notes || null,
        status: 'DRAFT',
      };

      const result = await window.electronAPI.invoices.create(invoiceData);

      if (result.success && result.data) {
        toast({
          title: 'Success',
          description: `Invoice ${result.data.invoiceNumber} created successfully`,
        });
        // Navigate after a short delay to ensure toast is visible
        setTimeout(() => {
          navigate('/invoices');
        }, 1000);
      } else {
        console.error('Invoice creation failed:', result);
        toast({
          title: 'Error',
          description: result.error || 'Failed to create invoice. Check console for details.',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Exception during invoice creation:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Error',
        description: `Failed to create invoice: ${errorMessage}`,
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/invoices');
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PageHeader
            title="Create Invoice"
            description="Create a new sales invoice or tax invoice"
            icon={FileText}
          />
        </div>

        <div className="glass-card rounded-lg p-6">
          <InvoiceForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      </div>
    </MainLayout>
  );
}

