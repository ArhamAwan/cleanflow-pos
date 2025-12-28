import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  onViewDetails?: () => void;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

export function SummaryCard({ title, value, icon: Icon, onViewDetails, variant = 'default' }: SummaryCardProps) {
  const getIconBgClass = () => {
    switch (variant) {
      case 'success':
        return 'bg-success/10 text-success';
      case 'warning':
        return 'bg-warning/10 text-warning';
      case 'destructive':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  return (
    <Card className="border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
          </div>
          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${getIconBgClass()}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        {onViewDetails && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-4 text-primary hover:text-primary/80 p-0 h-auto"
            onClick={onViewDetails}
          >
            View Details →
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
