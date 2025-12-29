import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Keyboard, MessageCircle } from 'lucide-react';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { keys: ['Ctrl', 'K'], description: 'Open search' },
  { keys: ['Esc'], description: 'Close dialogs' },
];

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Help & Support</DialogTitle>
          <DialogDescription>Keyboard shortcuts and support info.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Keyboard Shortcuts</h4>
            </div>
            <div className="space-y-2">
              {shortcuts.map((shortcut) => (
                <div key={shortcut.description} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{shortcut.description}</span>
                  <div className="flex gap-1">
                    {shortcut.keys.map((key) => (
                      <kbd key={key} className="px-2 py-1 text-xs bg-muted rounded border border-border">
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Documentation</h4>
            </div>
            <p className="text-sm text-muted-foreground">See the docs folder in this project for guides.</p>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Support</h4>
            </div>
            <p className="text-sm text-muted-foreground">Contact your system administrator for help.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
