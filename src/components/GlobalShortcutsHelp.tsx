import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard, Navigation, Zap, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

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

interface GlobalShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
  shortcuts: ShortcutConfig[];
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  formatShortcut: (shortcut: ShortcutConfig) => string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  "Navegação": <Navigation className="h-4 w-4" />,
  "Ações": <Zap className="h-4 w-4" />,
  "Sistema": <Settings className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  "Navegação": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Ações": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Sistema": "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export function GlobalShortcutsHelp({
  open,
  onClose,
  shortcuts,
  enabled,
  onEnabledChange,
  formatShortcut,
}: GlobalShortcutsHelpProps) {
  // Agrupar por categoria
  const grouped = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutConfig[]>);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[85vh] overflow-hidden"
          >
            <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Keyboard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Atalhos de Teclado</h2>
                    <p className="text-sm text-muted-foreground">
                      Navegue rapidamente pelo sistema
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Toggle */}
              <div className="flex items-center justify-between px-6 py-3 bg-muted/20 border-b border-border">
                <span className="text-sm font-medium">Atalhos habilitados</span>
                <Switch checked={enabled} onCheckedChange={onEnabledChange} />
              </div>

              {/* Content */}
              <div className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-6">
                {Object.entries(grouped).map(([category, categoryShortcuts]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`p-1.5 rounded-md ${categoryColors[category]}`}>
                        {categoryIcons[category]}
                      </div>
                      <h3 className="font-medium text-sm">{category}</h3>
                      <Badge variant="outline" className="text-xs">
                        {categoryShortcuts.length}
                      </Badge>
                    </div>

                    <div className="grid gap-2">
                      {categoryShortcuts.map((shortcut, index) => (
                        <motion.div
                          key={`${shortcut.key}-${index}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <span className="text-sm text-muted-foreground">
                            {shortcut.description}
                          </span>
                          <kbd className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono font-medium bg-background border border-border rounded shadow-sm">
                            {formatShortcut(shortcut)}
                          </kbd>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground text-center">
                  Pressione <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs mx-1">Shift + ?</kbd> para abrir esta ajuda
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default GlobalShortcutsHelp;
