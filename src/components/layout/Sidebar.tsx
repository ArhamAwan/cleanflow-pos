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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'accountant', 'data_entry'] },
  { path: '/customers', label: 'Customers', icon: Users, roles: ['admin', 'accountant', 'data_entry'] },
  { path: '/jobs', label: 'Jobs / Services', icon: Briefcase, roles: ['admin', 'accountant', 'data_entry'] },
  { path: '/payments', label: 'Payments', icon: CreditCard, roles: ['admin', 'accountant', 'data_entry'] },
  { path: '/expenses', label: 'Expenses', icon: Receipt, roles: ['admin', 'accountant', 'data_entry'] },
  { path: '/ledgers', label: 'Ledgers', icon: BookOpen, roles: ['admin', 'accountant'] },
  { path: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'accountant'] },
  { path: '/service-catalog', label: 'Service Catalog', icon: Package, roles: ['admin'] },
  { path: '/users', label: 'Users', icon: UserCog, roles: ['admin'] },
];

export function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  const filteredItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <aside className="w-60 min-h-[calc(100vh-4rem)] glass-sidebar no-print">
      <nav className="p-4 space-y-1">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary/20 text-sidebar-primary shadow-lg'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} />
              {item.label}
              {isActive && (
                <div className="ml-auto h-2 w-2 rounded-full bg-sidebar-primary animate-pulse-glow" />
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
