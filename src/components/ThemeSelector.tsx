import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeProvider';
import { THEME_VARIANTS, type ThemeVariant, type ThemeMode } from '@/types/themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sun, Moon, Monitor, Palette, Check, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const MODE_OPTIONS: { id: ThemeMode; label: string; icon: React.ElementType }[] = [
  { id: 'light', label: 'Claro', icon: Sun },
  { id: 'dark', label: 'Escuro', icon: Moon },
  { id: 'system', label: 'Sistema', icon: Monitor },
];

interface ThemeSelectorProps {
  compact?: boolean;
}

export function ThemeSelector({ compact = false }: ThemeSelectorProps) {
  const { mode, variant, setMode, setVariant, toggleMode, isDark } = useTheme();
  const [showCustomizer, setShowCustomizer] = useState(false);

  const currentVariant = THEME_VARIANTS.find(t => t.id === variant) || THEME_VARIANTS[0];

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMode}
        className="relative"
        aria-label="Alternar tema"
      >
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.div
              key="sun"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Sun className="h-5 w-5" />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Moon className="h-5 w-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">{currentVariant.icon} {currentVariant.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Modo de Aparência</DropdownMenuLabel>
          {MODE_OPTIONS.map(option => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => setMode(option.id)}
              className="gap-2"
            >
              <option.icon className="h-4 w-4" />
              {option.label}
              {mode === option.id && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Tema do Ambiente</DropdownMenuLabel>
          
          {THEME_VARIANTS.map(themeVariant => (
            <DropdownMenuItem
              key={themeVariant.id}
              onClick={() => setVariant(themeVariant.id)}
              className="gap-2"
            >
              <span>{themeVariant.icon}</span>
              {themeVariant.name}
              {variant === themeVariant.id && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowCustomizer(true)} className="gap-2">
            <Settings2 className="h-4 w-4" />
            Personalizar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ThemeCustomizerDialog open={showCustomizer} onOpenChange={setShowCustomizer} />
    </>
  );
}

interface ThemeCustomizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ThemeCustomizerDialog({ open, onOpenChange }: ThemeCustomizerDialogProps) {
  const { mode, variant, setMode, setVariant } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Personalizar Aparência
          </DialogTitle>
          <DialogDescription>
            Escolha o modo e tema que melhor se adapta ao seu ambiente de trabalho
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Mode Selection */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Modo de Aparência</h4>
            <div className="grid grid-cols-3 gap-3">
              {MODE_OPTIONS.map(option => (
                <button
                  key={option.id}
                  onClick={() => setMode(option.id)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                    mode === option.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <option.icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme Variants */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Tema do Ambiente</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEME_VARIANTS.map(themeVariant => (
                <motion.button
                  key={themeVariant.id}
                  onClick={() => setVariant(themeVariant.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'relative flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all',
                    variant === themeVariant.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {/* Preview Colors */}
                  <div className="flex flex-col gap-1.5">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: themeVariant.previewColors.background }}
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: themeVariant.previewColors.primary }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{themeVariant.icon}</span>
                      <span className="font-medium">{themeVariant.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {themeVariant.description}
                    </p>
                  </div>

                  {variant === themeVariant.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2"
                    >
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Prévia</h4>
            <div className="p-4 rounded-lg bg-card border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">V</span>
                </div>
                <div>
                  <p className="font-medium">VISÃO - Sistema de Vigilância</p>
                  <p className="text-sm text-muted-foreground">Centro de Monitoramento</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="h-8 rounded bg-primary flex items-center justify-center text-xs text-primary-foreground">
                  Primary
                </div>
                <div className="h-8 rounded bg-secondary flex items-center justify-center text-xs text-secondary-foreground">
                  Secondary
                </div>
                <div className="h-8 rounded bg-success flex items-center justify-center text-xs text-success-foreground">
                  Success
                </div>
                <div className="h-8 rounded bg-destructive flex items-center justify-center text-xs text-destructive-foreground">
                  Danger
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ThemeSelector;
