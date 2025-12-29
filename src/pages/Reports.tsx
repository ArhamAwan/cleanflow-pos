import { useState } from 'react';
import { Printer, FileSpreadsheet, Calendar } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { exportToExcel } from '@/lib/exportUtils';
import { useJobs, usePayments, useExpenses, useCustomers, useDatabaseInit } from '@/hooks/use-database';
import { useEffect } from 'react';

export default function Reports() {
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const { isElectron } = useDatabaseInit();
  const { jobs: dbJobs, fetchJobs } = useJobs();
  const { payments: dbPayments, fetchPayments } = usePayments();
  const { expenses: dbExpenses, fetchExpenses } = useExpenses();
  const { customers: dbCustomers, fetchCustomers } = useCustomers();

  useEffect(() => {
    if (isElectron) {
      fetchJobs({ startDate: dateFrom, endDate: dateTo });
      fetchPayments({ startDate: dateFrom, endDate: dateTo });
      fetchExpenses({ startDate: dateFrom, endDate: dateTo });
      fetchCustomers();
    }
  }, [isElectron, dateFrom, dateTo, fetchJobs, fetchPayments, fetchExpenses, fetchCustomers]);

  // Filter data by date range
  const filterByDate = <T extends { date: string }>(items: T[]) => 
    items.filter(item => item.date >= dateFrom && item.date <= dateTo);

  // Daily Report Data (filtered)
  const filteredJobs = isElectron ? filterByDate(dbJobs) : [];
  const filteredPayments = isElectron ? filterByDate(dbPayments) : [];
  const filteredExpenses = isElectron ? filterByDate(dbExpenses) : [];

  const totalCashIn = filteredPayments.filter(p => p.type === 'cash_in').reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netCash = totalCashIn - totalExpenses;

  // Monthly Report Data
  const monthlyRevenue = filteredJobs.reduce((sum, j) => sum + j.amount, 0);
  const outstandingReceivables = isElectron ? dbCustomers.reduce((sum, c) => sum + c.outstandingBalance, 0) : 0;
  const profitLoss = monthlyRevenue - totalExpenses;

  const handlePrint = () => {
    toast({
      title: 'Print Preview',
      description: 'Opening print preview...',
    });
    window.print();
  };

  const handleExportDaily = () => {
    exportToExcel(
      filteredJobs.map(job => ({
        'Job ID': job.id,
        'Customer': job.customerName,
        'Service': job.serviceName,
        'Date': job.date,
        'Amount': job.amount,
        'Paid': job.paidAmount,
        'Status': job.paymentStatus,
      })),
      'Daily_Report'
    );
    toast({
      title: 'Export Complete',
      description: 'Daily report has been exported to Excel.',
    });
  };

  const handleExportMonthly = () => {
    const summaryData = [
      { 'Metric': 'Total Revenue', 'Value': monthlyRevenue },
      { 'Metric': 'Total Expenses', 'Value': totalExpenses },
      { 'Metric': 'Outstanding Receivables', 'Value': outstandingReceivables },
      { 'Metric': 'Profit/Loss', 'Value': profitLoss },
    ];
    exportToExcel(summaryData, 'Monthly_Report');
    toast({
      title: 'Export Complete',
      description: 'Monthly report has been exported to Excel.',
    });
  };

  const setQuickDate = (range: 'today' | 'week' | 'month') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (range) {
      case 'today':
        setDateFrom(todayStr);
        setDateTo(todayStr);
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        setDateFrom(weekAgo.toISOString().split('T')[0]);
        setDateTo(todayStr);
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        setDateFrom(monthAgo.toISOString().split('T')[0]);
        setDateTo(todayStr);
        break;
    }
  };

  const ReportCard = ({ label, value, variant = 'default' }: { label: string; value: string; variant?: 'default' | 'success' | 'warning' | 'destructive' }) => {
    const valueClass = variant === 'success' ? 'text-success' : variant === 'destructive' ? 'text-destructive' : variant === 'warning' ? 'text-warning' : 'text-foreground';
    return (
      <div className="flex justify-between items-center py-3 border-b border-border/50 last:border-0">
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

      {/* Date Range Filter */}
      <div className="mb-6 glass-card rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickDate('today')} className="glass-input">
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDate('week')} className="glass-input">
              This Week
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDate('month')} className="glass-input">
              This Month
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="glass-card">
          <TabsTrigger value="daily">Daily Report</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="gradient-text">Daily Report</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {dateFrom === dateTo ? dateFrom : `${dateFrom} to ${dateTo}`}
                </p>
              </div>
              <div className="flex gap-2 no-print">
                <Button variant="outline" size="sm" onClick={handlePrint} className="glass-input">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportDaily} className="glass-input">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                <ReportCard label="Total Jobs" value={filteredJobs.length.toString()} />
                <ReportCard label="Total Job Value" value={formatCurrency(filteredJobs.reduce((sum, j) => sum + j.amount, 0))} />
                <Separator className="my-2" />
                <ReportCard label="Cash Collected" value={formatCurrency(totalCashIn)} variant="success" />
                <ReportCard label="Expenses" value={formatCurrency(totalExpenses)} variant="destructive" />
                <Separator className="my-2" />
                <ReportCard 
                  label="Net Cash" 
                  value={formatCurrency(netCash)} 
                  variant={netCash >= 0 ? 'success' : 'destructive'} 
                />
              </div>

              <div className="mt-6">
                <h4 className="font-semibold text-foreground mb-3">Jobs Breakdown</h4>
                <div className="bg-muted/30 rounded-xl p-4 space-y-2 backdrop-blur-sm">
                  {filteredJobs.length > 0 ? filteredJobs.map(job => (
                    <div key={job.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{job.customerName} - {job.serviceName}</span>
                      <span className="font-medium">{formatCurrency(job.amount)}</span>
                    </div>
                  )) : (
                    <p className="text-center text-muted-foreground">No jobs in selected date range</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="gradient-text">Monthly Report</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {dateFrom === dateTo ? dateFrom : `${dateFrom} to ${dateTo}`}
                </p>
              </div>
              <div className="flex gap-2 no-print">
                <Button variant="outline" size="sm" onClick={handlePrint} className="glass-input">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportMonthly} className="glass-input">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                <ReportCard label="Total Revenue (Jobs)" value={formatCurrency(monthlyRevenue)} variant="success" />
                <ReportCard label="Total Expenses" value={formatCurrency(totalExpenses)} variant="destructive" />
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
                  <div className="bg-muted/30 rounded-xl p-4 space-y-2 backdrop-blur-sm">
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
                  <div className="bg-muted/30 rounded-xl p-4 space-y-2 backdrop-blur-sm">
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
