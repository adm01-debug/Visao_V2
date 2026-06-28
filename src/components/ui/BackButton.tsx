/**
 * VISÃO - Back Button Component
 * A contextual back button for navigation
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '@/lib/haptics';
import { trackUXEvent } from '@/lib/uxTracker';

interface BackButtonProps {
  className?: string;
}

export const BackButton = React.forwardRef<HTMLButtonElement, BackButtonProps>(
  ({ className }, ref) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Hide back button on dashboard/root
    const isRoot = location.pathname === '/dashboard' || location.pathname === '/';

    if (isRoot) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            ref={ref}
            variant="ghost"
            size="icon"
            onClick={() => {
              triggerHaptic('light');
              navigate(-1);
            }}
            className={cn(
              "h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80",
              className
            )}
            aria-label="Voltar para a tela anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </motion.div>
      </AnimatePresence>
    );
  }
);

BackButton.displayName = 'BackButton';
