import { forwardRef } from 'react';
import { Job } from '@/types';
import { formatCurrency } from '@/data/mockData';

interface JobReceiptProps {
  job: Job;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
}

export const JobReceipt = forwardRef<HTMLDivElement, JobReceiptProps>(
  ({ job, companyName = 'SaniTech Services', companyAddress = 'Karachi, Pakistan', companyPhone = '021-12345678' }, ref) => {
    const printDate = new Date().toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <div ref={ref} className="bg-card p-8 max-w-md mx-auto print:bg-white print:text-black">
        {/* Header */}
        <div className="text-center border-b-2 border-primary pb-4 mb-4">
          <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-2">
            <span className="text-primary-foreground font-bold text-2xl">ST</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">{companyName}</h1>
          <p className="text-sm text-muted-foreground">{companyAddress}</p>
          <p className="text-sm text-muted-foreground">Phone: {companyPhone}</p>
        </div>

        {/* Receipt Title */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-semibold text-foreground">SERVICE RECEIPT</h2>
          <p className="text-sm text-muted-foreground">Receipt #: {job.id}</p>
          <p className="text-sm text-muted-foreground">Date: {printDate}</p>
        </div>

        {/* Customer Info */}
        <div className="bg-muted/30 rounded-lg p-3 mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-1">Bill To:</h3>
          <p className="text-foreground">{job.customerName}</p>
        </div>

        {/* Service Details */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-2 border-b border-border pb-1">Service Details</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-1">Description</th>
                <th className="text-right py-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2">{job.serviceName}</td>
                <td className="py-2 text-right">{formatCurrency(job.amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Summary */}
        <div className="border-t border-border pt-3 mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Service Date:</span>
            <span className="text-foreground">{job.date}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Total Amount:</span>
            <span className="font-semibold text-foreground">{formatCurrency(job.amount)}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Amount Paid:</span>
            <span className="text-success">{formatCurrency(job.paidAmount)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold border-t border-border pt-2 mt-2">
            <span className={job.amount - job.paidAmount > 0 ? 'text-destructive' : 'text-success'}>
              {job.amount - job.paidAmount > 0 ? 'Balance Due:' : 'Fully Paid'}
            </span>
            {job.amount - job.paidAmount > 0 && (
              <span className="text-destructive">{formatCurrency(job.amount - job.paidAmount)}</span>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="text-center mb-4">
          <span className={`inline-block px-4 py-1 rounded-full text-sm font-medium ${
            job.paymentStatus === 'paid' 
              ? 'bg-success/10 text-success' 
              : job.paymentStatus === 'partial'
                ? 'bg-warning/10 text-warning'
                : 'bg-destructive/10 text-destructive'
          }`}>
            {job.paymentStatus === 'paid' ? '✓ PAID' : job.paymentStatus === 'partial' ? 'PARTIAL PAYMENT' : 'UNPAID'}
          </span>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground border-t border-border pt-4">
          <p>Thank you for choosing {companyName}!</p>
          <p className="mt-1">For inquiries, call: {companyPhone}</p>
        </div>
      </div>
    );
  }
);

JobReceipt.displayName = 'JobReceipt';
