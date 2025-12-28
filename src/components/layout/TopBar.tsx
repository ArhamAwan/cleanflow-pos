import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';

export function TopBar() {
  const { user, logout } = useAuth();

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-primary/10 text-primary';
      case 'accountant':
        return 'bg-secondary/10 text-secondary';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <header className="h-16 glass-topbar px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg glow-primary">
          <span className="text-primary-foreground font-bold text-lg">ST</span>
        </div>
        <div>
          <h1 className="font-semibold text-lg gradient-text">SaniTech Services</h1>
          <p className="text-xs text-muted-foreground">POS & Ledger System</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        
        {user && (
          <>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-border/50">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeClass(user.role)}`}>
                  {formatRole(user.role)}
                </span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={logout} 
              className="text-muted-foreground hover:text-foreground hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
