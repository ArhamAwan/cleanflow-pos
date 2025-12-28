import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  trend?: {
    value: number;
    label?: string;
  };
  description?: string;
}

export function SummaryCard({ 
  title, 
  value, 
  icon: Icon, 
  variant = 'default', 
  trend,
  description
}: SummaryCardProps) {
  const iconWrapperClass = cn(
    'h-10 w-10 rounded-lg flex items-center justify-center',
    {
      'bg-primary/10 text-primary': variant === 'default',
      'bg-success/10 text-success': variant === 'success',
      'bg-warning/10 text-warning': variant === 'warning',
      'bg-destructive/10 text-destructive': variant === 'destructive',
    }
  );

  const trendColor = trend?.value && trend.value >= 0 ? 'text-success' : 'text-destructive';
  const TrendIcon = trend?.value && trend.value >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="bg-card border border-border rounded-xl p-5 transition-all duration-200 hover:border-primary/30">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {trend && (
          <div className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', trendColor, {
            'bg-success/10': trend.value >= 0,
            'bg-destructive/10': trend.value < 0,
          })}>
            <TrendIcon className="h-3 w-3" />
            <span>{trend.value >= 0 ? '+' : ''}{trend.value}%</span>
          </div>
        )}
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-foreground font-mono tracking-tight">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
          )}
          {trend?.label && !description && (
            <p className="text-xs text-muted-foreground mt-1.5">{trend.label}</p>
          )}
        </div>
        <div className={iconWrapperClass}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
