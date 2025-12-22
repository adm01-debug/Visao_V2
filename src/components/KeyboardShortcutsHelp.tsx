import { useOnClickOutside } from "@/hooks";
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: KeyboardShortcutsHelp
 * 
 * Modal com lista de atalhos de teclado disponíveis
 */

import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Keyboard, Navigation, Zap, Play, Settings } from 'lucide-react';
import { KeyboardShortcut, getShortcutLabel } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: KeyboardShortcut[];
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

const categoryIcons = {
  navigation: Navigation,
  actions: Zap,
  media: Play,
  general: Settings,
};

const categoryLabels = {
  navigation: 'Navegação',
  actions: 'Ações',
  media: 'Mídia',
  general: 'Geral',
};

export function KeyboardShortcutsHelp({
  open,
  onOpenChange,
  shortcuts,
  enabled,
  onEnabledChange,
}: KeyboardShortcutsHelpProps) {
  // Agrupar por categoria
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  // Fechar com Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Atalhos de Teclado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Toggle para ativar/desativar */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">Atalhos de Teclado</p>
              <p className="text-sm text-muted-foreground">
                Ative para usar atalhos de teclado em toda a aplicação
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={onEnabledChange}
            />
          </div>

          {/* Lista de atalhos por categoria */}
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => {
            const Icon = categoryIcons[category as keyof typeof categoryIcons] || Keyboard;
            const label = categoryLabels[category as keyof typeof categoryLabels] || category;

            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  <Icon className="h-4 w-4" />
                  {label}
                </div>
                
                <div className="grid gap-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={`${shortcut.key}-${index}`}
                      className="flex items-center justify-between p-2 bg-background border rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {getShortcutLabel(shortcut)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Dica */}
          <div className="text-xs text-muted-foreground text-center pt-4 border-t">
            Pressione <Badge variant="outline" className="font-mono text-xs mx-1">Shift + ?</Badge> 
            ou <Badge variant="outline" className="font-mono text-xs mx-1">F1</Badge> 
            para abrir esta ajuda a qualquer momento
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsHelp;
