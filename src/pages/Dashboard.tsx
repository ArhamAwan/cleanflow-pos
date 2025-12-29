import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, CreditCard, Receipt, Wallet } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { SummaryCard } from '@/components/shared/SummaryCard';
import { mockJobs, mockPayments, mockExpenses, formatCurrency } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useJobs, usePayments, useExpenses, useDatabaseInit } from '@/hooks/use-database';
import { Job, Payment, Expense } from '@/types';

type TimeFilter = 'today' | 'week' | 'month';

export default function Dashboard() {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  
  // Database hooks
  const { isElectron } = useDatabaseInit();
  const { jobs: dbJobs, fetchJobs } = useJobs();
  const { payments: dbPayments, fetchPayments } = usePayments();
  const { expenses: dbExpenses, fetchExpenses } = useExpenses();

  // Fetch data on mount if in Electron
  useEffect(() => {
    if (isElectron) {
      const today = new Date().toISOString().split('T')[0];
      fetchJobs({ startDate: today, endDate: today });
      fetchPayments({ startDate: today, endDate: today });
      fetchExpenses({ startDate: today, endDate: today });
    }
  }, [isElectron, fetchJobs, fetchPayments, fetchExpenses]);

  // Use DB data if available, otherwise mock data
  const jobs: Job[] = isElectron && dbJobs.length > 0 ? dbJobs : mockJobs;
  const payments: Payment[] = isElectron && dbPayments.length > 0 ? dbPayments : mockPayments;
  const expenses: Expense[] = isElectron && dbExpenses.length > 0 ? dbExpenses : mockExpenses;

  // Calculate today's stats
  const today = new Date().toISOString().split('T')[0];
  const todayJobs = jobs.filter(job => job.date === today || job.date === '2024-12-28');
  const todayJobsCount = todayJobs.length;
  
  const todayCashIn = payments
    .filter(p => (p.date === today || p.date === '2024-12-28') && p.type === 'cash_in')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const todayExpensesTotal = expenses
    .filter(e => e.date === today || e.date === '2024-12-28')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const netCash = todayCashIn - todayExpensesTotal;

  const timeFilters: { value: TimeFilter; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
  ];

  // Get recent items for display
  const recentJobs = todayJobs.slice(0, 4);
  const recentPayments = payments.slice(0, 4);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader 
          title="Dashboard" 
          description="Business summary at a glance"
        />
        
        {/* Time Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          {timeFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setTimeFilter(filter.value)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150',
                timeFilter === filter.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Today's Jobs"
          value={todayJobsCount.toString()}
          icon={Briefcase}
          trend={{ value: 12.5, label: 'vs last week' }}
          description={`${todayJobs.filter(j => j.paymentStatus === 'paid').length} completed, ${todayJobs.filter(j => j.paymentStatus !== 'paid').length} pending`}
        />
        
        <SummaryCard
          title="Cash Collected"
          value={formatCurrency(todayCashIn)}
          icon={CreditCard}
          variant="success"
          trend={{ value: 8.2, label: 'vs last week' }}
        />
        
        <SummaryCard
          title="Today's Expenses"
          value={formatCurrency(todayExpensesTotal)}
          icon={Receipt}
          variant="warning"
          trend={{ value: -5.4, label: 'vs last week' }}
        />
        
        <SummaryCard
          title="Net Cash Balance"
          value={formatCurrency(netCash)}
          icon={Wallet}
          variant={netCash >= 0 ? 'success' : 'destructive'}
          trend={{ value: netCash >= 0 ? 15.3 : -15.3 }}
          description="End of day projection"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Recent Jobs
          </h3>
          <div className="space-y-1">
            {recentJobs.map(job => (
              <div key={job.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                <div>
                  <p className="font-medium text-foreground text-sm">{job.customerName}</p>
                  <p className="text-xs text-muted-foreground">{job.serviceName}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground text-sm font-mono">{formatCurrency(job.amount)}</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', {
                    'bg-success/10 text-success': job.paymentStatus === 'paid',
                    'bg-warning/10 text-warning': job.paymentStatus === 'partial',
                    'bg-destructive/10 text-destructive': job.paymentStatus === 'unpaid',
                  })}>
                    {job.paymentStatus.charAt(0).toUpperCase() + job.paymentStatus.slice(1)}
                  </span>
                </div>
              </div>
            ))}
            {recentJobs.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No jobs today</p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Recent Payments
          </h3>
          <div className="space-y-1">
            {recentPayments.map(payment => (
              <div key={payment.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                <div>
                  <p className="font-medium text-foreground text-sm">{payment.description}</p>
                  <p className="text-xs text-muted-foreground">{payment.method.toUpperCase()} • {payment.date}</p>
                </div>
                <p className={cn('font-semibold text-sm font-mono', {
                  'text-success': payment.type === 'cash_in',
                  'text-destructive': payment.type !== 'cash_in',
                })}>
                  {payment.type === 'cash_in' ? '+' : '-'}{formatCurrency(payment.amount)}
                </p>
              </div>
            ))}
            {recentPayments.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No payments yet</p>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
