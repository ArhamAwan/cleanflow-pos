import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function TopBar() {
  const { user, logout } = useAuth();

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-primary/10 text-primary';
      case 'accountant':
        return 'bg-accent text-accent-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg">ST</span>
        </div>
        <div>
          <h1 className="font-semibold text-lg text-foreground">SaniTech Services</h1>
          <p className="text-xs text-muted-foreground">POS & Ledger System</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeClass(user.role)}`}>
                  {formatRole(user.role)}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
