import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'paid' | 'partial' | 'unpaid' | 'active' | 'inactive';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'paid':
      case 'active':
        return 'bg-success/10 text-success';
      case 'partial':
        return 'bg-warning/10 text-warning';
      case 'unpaid':
      case 'inactive':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatStatus = () => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', getStatusStyles())}>
      {formatStatus()}
    </span>
  );
}
