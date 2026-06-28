/**
 * VISÃO - Enhanced Back Button Component
 * A contextual back button with history dropdown
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '@/lib/haptics';
import { trackUXEvent } from '@/lib/uxTracker';
import { useNavigationHistory } from '@/contexts/HistoryContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BackButtonProps {
  className?: string;
}

export const BackButton = React.forwardRef<HTMLButtonElement, BackButtonProps>(
  ({ className }, ref) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { history } = useNavigationHistory();

    // Hide back button on dashboard/root
    const isRoot = location.pathname === '/dashboard' || location.pathname === '/';

    // Exclude current page from history dropdown
    const historyItems = history.filter(item => item.pathname !== location.pathname);

    if (isRoot) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="flex items-center"
        >
          <DropdownMenu>
            <div className="flex items-center bg-muted/40 rounded-lg p-0.5 border border-border/50">
              <Button
                ref={ref}
                variant="ghost"
                size="icon"
                onClick={() => {
                  triggerHaptic('light');
                  trackUXEvent('back_button_click', { from: location.pathname });
                  navigate(-1);
                }}
                className={cn(
                  "h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-background shadow-sm transition-all",
                  className
                )}
                aria-label="Voltar para a tela anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {historyItems.length > 0 && (
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-all ml-0.5"
                    aria-label="Ver histórico recente"
                  >
                    <History className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              )}
            </div>

            <DropdownMenuContent align="start" className="w-56 mt-1">
              <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-2">
                Histórico Recente
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {historyItems.map((item, index) => (
                <DropdownMenuItem
                  key={`${item.pathname}-${item.timestamp}-${index}`}
                  onClick={() => {
                    triggerHaptic('medium');
                    trackUXEvent('history_jump', { to: item.pathname });
                    navigate(item.pathname);
                  }}
                  className="flex flex-col items-start gap-0.5 py-2"
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-[10px] text-muted-foreground">{item.pathname}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>
      </AnimatePresence>
    );
  }
);

BackButton.displayName = 'BackButton';

