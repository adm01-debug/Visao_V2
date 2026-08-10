/**
 * VISÃO - Shortcuts Help Dialog
 * Mostra todos os atalhos de teclado disponíveis (Shift+?)
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Keyboard } from 'lucide-react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  category: string;
}

interface ShortcutsHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcutsByCategory: Record<string, ShortcutConfig[]>;
  formatShortcut: (shortcut: ShortcutConfig) => string;
}

export function ShortcutsHelpDialog({
  open,
  onOpenChange,
  shortcutsByCategory,
  formatShortcut,
}: ShortcutsHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-primary" />
            Atalhos de Teclado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {Object.entries(shortcutsByCategory).map(([category, shortcuts], idx) => (
            <div key={category}>
              {idx > 0 && <Separator className="mb-4" />}
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {category}
              </h3>
              <div className="space-y-1">
                {shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key + shortcut.description}
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm text-foreground">{shortcut.description}</span>
                    <kbd className="inline-flex items-center gap-1 rounded border bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Pressione{' '}
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono">Shift + ?</kbd>{' '}
          para abrir/fechar
        </p>
      </DialogContent>
    </Dialog>
  );
}

export default ShortcutsHelpDialog;
