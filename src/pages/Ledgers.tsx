import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { mockCashLedger, mockCustomers, mockExpenses, formatCurrency } from '@/data/mockData';

export default function Ledgers() {
  // Generate customer ledger entries
  const customerLedgerEntries = mockCustomers.map((customer, index) => ({
    id: `CL-${index + 1}`,
    date: '2024-12-28',
    description: customer.name,
    debit: customer.outstandingBalance,
    credit: 0,
    balance: customer.outstandingBalance,
  }));

  // Generate expense ledger entries
  const expenseLedgerEntries = mockExpenses.map((expense, index) => {
    const runningBalance = mockExpenses
      .slice(0, index + 1)
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      id: `EL-${index + 1}`,
      date: expense.date,
      description: `${expense.category}: ${expense.description}`,
      debit: expense.amount,
      credit: 0,
      balance: runningBalance,
    };
  });

  const LedgerTable = ({ entries }: { entries: typeof mockCashLedger }) => (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold">Description</TableHead>
            <TableHead className="font-semibold text-right">Debit (PKR)</TableHead>
            <TableHead className="font-semibold text-right">Credit (PKR)</TableHead>
            <TableHead className="font-semibold text-right">Balance (PKR)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id} className="hover:bg-muted/30">
              <TableCell className="font-medium">{entry.date}</TableCell>
              <TableCell>{entry.description}</TableCell>
              <TableCell className="text-right text-destructive">
                {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
              </TableCell>
              <TableCell className="text-right text-success">
                {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(entry.balance)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <MainLayout>
      <PageHeader 
        title="Ledgers" 
        description="View detailed accounting ledgers (Read-only)"
      />

      <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
        <p className="text-sm text-muted-foreground">
          📋 These ledgers are read-only for audit purposes. No modifications are allowed.
        </p>
      </div>

      <Tabs defaultValue="cash" className="w-full">
        <TabsList>
          <TabsTrigger value="cash">Cash Ledger</TabsTrigger>
          <TabsTrigger value="customer">Customer Ledger</TabsTrigger>
          <TabsTrigger value="expense">Expense Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="cash" className="mt-4">
          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Cash Balance</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(mockCashLedger[mockCashLedger.length - 1].balance)}
                </p>
              </div>
            </div>
          </div>
          <LedgerTable entries={mockCashLedger} />
        </TabsContent>

        <TabsContent value="customer" className="mt-4">
          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding Receivables</p>
                <p className="text-2xl font-bold text-destructive">
                  {formatCurrency(mockCustomers.reduce((sum, c) => sum + c.outstandingBalance, 0))}
                </p>
              </div>
            </div>
          </div>
          <LedgerTable entries={customerLedgerEntries} />
        </TabsContent>

        <TabsContent value="expense" className="mt-4">
          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-destructive">
                  {formatCurrency(mockExpenses.reduce((sum, e) => sum + e.amount, 0))}
                </p>
              </div>
            </div>
          </div>
          <LedgerTable entries={expenseLedgerEntries} />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
