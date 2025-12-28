import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  onViewDetails?: () => void;
}

export function SummaryCard({ title, value, icon: Icon, variant = 'default', onViewDetails }: SummaryCardProps) {
  const iconWrapperClass = cn(
    'h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300',
    {
      'bg-primary/10 text-primary': variant === 'default',
      'bg-success/10 text-success glow-success': variant === 'success',
      'bg-warning/10 text-warning glow-warning': variant === 'warning',
      'bg-destructive/10 text-destructive glow-destructive': variant === 'destructive',
    }
  );

  const borderClass = cn({
    'border-primary/20': variant === 'default',
    'border-success/20': variant === 'success',
    'border-warning/20': variant === 'warning',
    'border-destructive/20': variant === 'destructive',
  });

  return (
    <div className={cn('glass-card rounded-xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl', borderClass)}>
      <div className="flex items-start justify-between">
        <div className={iconWrapperClass}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      </div>
      {onViewDetails && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onViewDetails} 
          className="mt-4 w-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          View Details →
        </Button>
      )}
    </div>
  );
}
