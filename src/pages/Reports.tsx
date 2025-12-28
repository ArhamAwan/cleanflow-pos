import { Printer, FileSpreadsheet } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { mockJobs, mockPayments, mockExpenses, mockCustomers, formatCurrency } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

export default function Reports() {
  const { toast } = useToast();

  // Daily Report Data (2024-12-28)
  const todayJobs = mockJobs.filter(j => j.date === '2024-12-28');
  const todayCashIn = mockPayments.filter(p => p.date === '2024-12-28' && p.type === 'cash_in').reduce((sum, p) => sum + p.amount, 0);
  const todayExpenses = mockExpenses.filter(e => e.date === '2024-12-28').reduce((sum, e) => sum + e.amount, 0);
  const todayNetCash = todayCashIn - todayExpenses;

  // Monthly Report Data
  const monthlyRevenue = mockJobs.reduce((sum, j) => sum + j.amount, 0);
  const monthlyExpenses = mockExpenses.reduce((sum, e) => sum + e.amount, 0);
  const outstandingReceivables = mockCustomers.reduce((sum, c) => sum + c.outstandingBalance, 0);
  const profitLoss = monthlyRevenue - monthlyExpenses;

  const handlePrint = () => {
    toast({
      title: 'Print Preview',
      description: 'Opening print preview...',
    });
    window.print();
  };

  const handleExport = () => {
    toast({
      title: 'Export Started',
      description: 'Report is being exported to Excel...',
    });
  };

  const ReportCard = ({ label, value, variant = 'default' }: { label: string; value: string; variant?: 'default' | 'success' | 'warning' | 'destructive' }) => {
    const valueClass = variant === 'success' ? 'text-success' : variant === 'destructive' ? 'text-destructive' : variant === 'warning' ? 'text-warning' : 'text-foreground';
    return (
      <div className="flex justify-between items-center py-3 border-b border-border last:border-0">
        <span className="text-muted-foreground">{label}</span>
        <span className={`text-lg font-semibold ${valueClass}`}>{value}</span>
      </div>
    );
  };

  return (
    <MainLayout>
      <PageHeader 
        title="Reports" 
        description="Generate and view business reports"
      />

      <Tabs defaultValue="daily" className="w-full">
        <TabsList>
          <TabsTrigger value="daily">Daily Report</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Daily Report</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">December 28, 2024</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                <ReportCard label="Total Jobs Completed" value={todayJobs.length.toString()} />
                <ReportCard label="Total Job Value" value={formatCurrency(todayJobs.reduce((sum, j) => sum + j.amount, 0))} />
                <Separator className="my-2" />
                <ReportCard label="Cash Collected" value={formatCurrency(todayCashIn)} variant="success" />
                <ReportCard label="Expenses" value={formatCurrency(todayExpenses)} variant="destructive" />
                <Separator className="my-2" />
                <ReportCard 
                  label="Net Cash" 
                  value={formatCurrency(todayNetCash)} 
                  variant={todayNetCash >= 0 ? 'success' : 'destructive'} 
                />
              </div>

              <div className="mt-6">
                <h4 className="font-semibold text-foreground mb-3">Jobs Breakdown</h4>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  {todayJobs.map(job => (
                    <div key={job.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{job.customerName} - {job.serviceName}</span>
                      <span className="font-medium">{formatCurrency(job.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Monthly Report</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">December 2024</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                <ReportCard label="Total Revenue (Jobs)" value={formatCurrency(monthlyRevenue)} variant="success" />
                <ReportCard label="Total Expenses" value={formatCurrency(monthlyExpenses)} variant="destructive" />
                <Separator className="my-2" />
                <ReportCard label="Outstanding Receivables" value={formatCurrency(outstandingReceivables)} variant="warning" />
                <Separator className="my-2" />
                <ReportCard 
                  label="Profit / Loss" 
                  value={`${profitLoss >= 0 ? '+' : ''}${formatCurrency(profitLoss)}`}
                  variant={profitLoss >= 0 ? 'success' : 'destructive'} 
                />
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Top Customers by Revenue</h4>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Karachi Hospital</span>
                      <span className="font-medium">{formatCurrency(21000)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">National Bank HQ</span>
                      <span className="font-medium">{formatCurrency(15000)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Lahore University</span>
                      <span className="font-medium">{formatCurrency(12000)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-3">Expense Breakdown</h4>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Staff Salary</span>
                      <span className="font-medium">{formatCurrency(45000)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Utilities</span>
                      <span className="font-medium">{formatCurrency(12000)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Supplies</span>
                      <span className="font-medium">{formatCurrency(8000)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
