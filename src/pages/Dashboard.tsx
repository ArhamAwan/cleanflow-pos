import { useNavigate } from 'react-router-dom';
import { Briefcase, CreditCard, Receipt, Wallet } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { SummaryCard } from '@/components/shared/SummaryCard';
import { mockJobs, mockPayments, mockExpenses, formatCurrency } from '@/data/mockData';

export default function Dashboard() {
  const navigate = useNavigate();

  // Calculate today's stats (using mock data)
  const todayJobs = mockJobs.filter(job => job.date === '2024-12-28');
  const todayJobsCount = todayJobs.length;
  
  const todayCashIn = mockPayments
    .filter(p => p.date === '2024-12-28' && p.type === 'cash_in')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const todayExpenses = mockExpenses
    .filter(e => e.date === '2024-12-28')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const netCash = todayCashIn - todayExpenses;

  return (
    <MainLayout>
      <PageHeader 
        title="Dashboard" 
        description="Today's business summary at a glance"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Today's Jobs"
          value={todayJobsCount.toString()}
          icon={Briefcase}
          onViewDetails={() => navigate('/jobs')}
        />
        
        <SummaryCard
          title="Cash Collected"
          value={formatCurrency(todayCashIn)}
          icon={CreditCard}
          variant="success"
          onViewDetails={() => navigate('/payments')}
        />
        
        <SummaryCard
          title="Today's Expenses"
          value={formatCurrency(todayExpenses)}
          icon={Receipt}
          variant="warning"
          onViewDetails={() => navigate('/expenses')}
        />
        
        <SummaryCard
          title="Net Cash Balance"
          value={formatCurrency(netCash)}
          icon={Wallet}
          variant={netCash >= 0 ? 'success' : 'destructive'}
          onViewDetails={() => navigate('/ledgers')}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Recent Jobs
          </h3>
          <div className="space-y-3">
            {todayJobs.map(job => (
              <div key={job.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                <div>
                  <p className="font-medium text-foreground">{job.customerName}</p>
                  <p className="text-sm text-muted-foreground">{job.serviceName}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">{formatCurrency(job.amount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    job.paymentStatus === 'paid' ? 'bg-success/10 text-success' :
                    job.paymentStatus === 'partial' ? 'bg-warning/10 text-warning' :
                    'bg-destructive/10 text-destructive'
                  }`}>
                    {job.paymentStatus.charAt(0).toUpperCase() + job.paymentStatus.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-secondary" />
            Recent Payments
          </h3>
          <div className="space-y-3">
            {mockPayments.slice(0, 4).map(payment => (
              <div key={payment.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                <div>
                  <p className="font-medium text-foreground">{payment.description}</p>
                  <p className="text-sm text-muted-foreground">{payment.method.toUpperCase()} • {payment.date}</p>
                </div>
                <p className={`font-semibold ${payment.type === 'cash_in' ? 'text-success' : 'text-destructive'}`}>
                  {payment.type === 'cash_in' ? '+' : '-'}{formatCurrency(payment.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
