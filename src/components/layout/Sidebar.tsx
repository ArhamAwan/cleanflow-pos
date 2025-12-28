import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CreditCard,
  Receipt,
  BookOpen,
  BarChart3,
  UserCog,
  Package,
  Plus,
  Settings,
  HelpCircle,
  Search,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const mainNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'accountant', 'data_entry'] },
  { path: '/customers', label: 'Customers', icon: Users, roles: ['admin', 'accountant', 'data_entry'] },
  { path: '/jobs', label: 'Jobs / Services', icon: Briefcase, roles: ['admin', 'accountant', 'data_entry'] },
  { path: '/payments', label: 'Payments', icon: CreditCard, roles: ['admin', 'accountant', 'data_entry'] },
  { path: '/expenses', label: 'Expenses', icon: Receipt, roles: ['admin', 'accountant', 'data_entry'] },
];

const reportingNavItems = [
  { path: '/ledgers', label: 'Ledgers', icon: BookOpen, roles: ['admin', 'accountant'] },
  { path: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'accountant'] },
];

const settingsNavItems = [
  { path: '/service-catalog', label: 'Service Catalog', icon: Package, roles: ['admin'] },
  { path: '/users', label: 'Users', icon: UserCog, roles: ['admin'] },
];

export function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  const filterByRole = (items: typeof mainNavItems) => 
    items.filter(item => user && item.roles.includes(user.role));

  const filteredMain = filterByRole(mainNavItems);
  const filteredReporting = filterByRole(reportingNavItems);
  const filteredSettings = filterByRole(settingsNavItems);

  const renderNavItem = (item: typeof mainNavItems[0]) => {
    const isActive = location.pathname === item.path;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-primary/15 text-primary'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        )}
      >
        <item.icon className="h-4 w-4" />
        {item.label}
      </NavLink>
    );
  };

  const userInitials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <aside className="w-56 min-h-[calc(100vh-4rem)] bg-sidebar border-r border-sidebar-border flex flex-col no-print">
      {/* Quick Create Button */}
      <div className="p-3">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Quick Create
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-3 space-y-6 overflow-y-auto">
        {/* Main Section */}
        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Main
          </p>
          {filteredMain.map(renderNavItem)}
        </div>

        {/* Reporting Section */}
        {filteredReporting.length > 0 && (
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Reporting
            </p>
            {filteredReporting.map(renderNavItem)}
          </div>
        )}

        {/* Settings Section */}
        {filteredSettings.length > 0 && (
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Settings
            </p>
            {filteredSettings.map(renderNavItem)}
          </div>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground w-full transition-colors">
          <Search className="h-4 w-4" />
          Search
        </button>
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground w-full transition-colors">
          <Settings className="h-4 w-4" />
          Settings
        </button>
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground w-full transition-colors">
          <HelpCircle className="h-4 w-4" />
          Get Help
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-lg bg-sidebar-accent/50">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role?.replace('_', ' ') || 'Role'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
