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
  { path: '/users', label: 'Users', icon: UserCog, roles: ['admin'] },
];

export function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  const filteredItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <aside className="w-60 min-h-screen bg-sidebar border-r border-sidebar-border">
      <nav className="p-4 space-y-1">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
