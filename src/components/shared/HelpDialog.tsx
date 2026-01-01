import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  Settings,
  BookOpen,
  BarChart3,
} from 'lucide-react';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const navigate = useNavigate();

  const quickLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/customers', label: 'Customers', icon: Users },
    { path: '/invoices', label: 'Invoices', icon: FileText },
    { path: '/items', label: 'Inventory', icon: Package },
    { path: '/company-settings', label: 'Settings', icon: Settings },
    { path: '/ledgers', label: 'Ledgers', icon: BookOpen },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
  ];

  const keyboardShortcuts = [
    { keys: ['⌘', 'K'], description: 'Open global search' },
    { keys: ['⌘', '/'], description: 'Show keyboard shortcuts' },
    { keys: ['Esc'], description: 'Close dialogs' },
  ];

  const handleQuickLink = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-static max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Help & Support</DialogTitle>
          <DialogDescription>
            Quick links and keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Quick Links</h3>
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map((link) => (
                <Button
                  key={link.path}
                  variant="outline"
                  className="justify-start"
                  onClick={() => handleQuickLink(link.path)}
                >
                  <link.icon className="h-4 w-4 mr-2" />
                  {link.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Keyboard Shortcuts</h3>
            <div className="space-y-2">
              {keyboardShortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-sidebar-accent/50"
                >
                  <span className="text-sm text-muted-foreground">
                    {shortcut.description}
                  </span>
                  <div className="flex gap-1">
                    {shortcut.keys.map((key, keyIndex) => (
                      <kbd
                        key={keyIndex}
                        className="px-2 py-1 text-xs font-semibold text-foreground bg-background border border-border rounded"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* App Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">About</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">SaniTech Services POS & Ledger System</strong>
              </p>
              <p>
                A comprehensive point-of-sale and ledger management system for service-based businesses.
              </p>
              <p className="pt-2">
                For support or questions, please contact your system administrator.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

