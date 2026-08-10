import React, { memo, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { NavCategory } from '../../types';
import { AnimatedCategoryIcon } from '../AnimatedCategoryIcon';
import { CategoryStatusIndicator } from '../CategoryStatusIndicator';
import { CollapsedCategory } from './CollapsedCategory';
import { NavItemLink } from './NavItemLink';

interface CategoryItemProps {
  category: NavCategory;
  collapsed: boolean;
  isExpanded: boolean;
  isActive: boolean;
  onToggle: () => void;
  isItemActive: (path: string) => boolean;
  onNavigate?: () => void;
  isLoading?: boolean;
}

export const CategoryItem = memo(
  React.forwardRef(function CategoryItem(
    {
      category,
      collapsed,
      isExpanded,
      isActive,
      onToggle,
      isItemActive,
      onNavigate,
      isLoading,
    }: CategoryItemProps,
    _ref
  ) {
    const CategoryIcon = category.icon;
    const status = category.getStatus?.() || { type: 'neutral' as const, label: '' };
    const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
    const rippleId = useRef(0);

    const handleRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = rippleId.current++;
      setRipples((prev) => [...prev, { id, x, y }]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);
    }, []);

    if (collapsed) {
      return (
        <CollapsedCategory
          category={category}
          status={status}
          isActive={isActive}
          isItemActive={isItemActive}
          onNavigate={onNavigate}
          isLoading={isLoading}
        />
      );
    }

    return (
      <Collapsible open={isExpanded} onOpenChange={onToggle} className="mb-0.5">
        <CollapsibleTrigger asChild>
          <motion.button
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            layout
            transition={{ layout: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } }}
            onClick={handleRipple}
            className={cn(
              'relative overflow-hidden flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium',
              'transition-all duration-300 ease-out',
              'text-sidebar-foreground/65 hover:text-sidebar-foreground',
              'hover:bg-sidebar-accent/60 hover:shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.06)]',
              isActive &&
                !isExpanded &&
                'bg-sidebar-accent/60 text-sidebar-primary shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.08)]',
              isExpanded && 'bg-sidebar-accent/40 text-sidebar-foreground'
            )}
          >
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className="absolute rounded-full pointer-events-none animate-[sidebar-ripple_0.6s_ease-out_forwards]"
                style={{
                  left: ripple.x,
                  top: ripple.y,
                  width: 0,
                  height: 0,
                  transform: 'translate(-50%, -50%)',
                  background: 'hsl(var(--primary) / 0.15)',
                }}
              />
            ))}
            <div className="flex items-center gap-2.5">
              <AnimatedCategoryIcon
                icon={CategoryIcon}
                status={status}
                isExpanded={isExpanded}
                isActive={isActive}
              />
              <span
                className={cn(
                  'transition-colors duration-300',
                  isExpanded && 'text-sidebar-foreground'
                )}
              >
                {category.label}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <AnimatePresence mode="wait">
                {!isExpanded &&
                  (isLoading ? (
                    <motion.div
                      key="shimmer"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="relative h-5 w-16 rounded-full bg-muted/40 overflow-hidden border border-border/20"
                    >
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent" />
                    </motion.div>
                  ) : status.label ? (
                    <CategoryStatusIndicator status={status} collapsed={false} />
                  ) : null)}
              </AnimatePresence>

              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, duration: 0.35 }}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground/60" />
              </motion.div>
            </div>
          </motion.button>
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="mt-1 ml-4 space-y-0.5 border-l-2 border-primary/15 pl-3"
              >
                {category.items.map((item, index) => (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -12, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{
                      delay: index * 0.04,
                      duration: 0.3,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                  >
                    <NavItemLink
                      item={item}
                      isActive={isItemActive(item.path)}
                      onClick={onNavigate}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>
    );
  })
);
