import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { NavCategory, CategoryStatus } from '../../types';
import { AnimatedCategoryIcon } from '../AnimatedCategoryIcon';
import { NavItemCollapsed } from './NavItemCollapsed';

interface CollapsedCategoryProps {
  category: NavCategory;
  status: CategoryStatus;
  isActive: boolean;
  isItemActive: (path: string) => boolean;
  onNavigate?: () => void;
  isLoading?: boolean;
}

export const CollapsedCategory = memo(
  React.forwardRef(function CollapsedCategory(
    { category, status, isActive, isItemActive, onNavigate, isLoading }: CollapsedCategoryProps,
    _ref
  ) {
    const CategoryIcon = category.icon;

    return (
      <div className="space-y-1 mb-3 relative">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="flex justify-center py-1 relative">
              <AnimatedCategoryIcon
                icon={CategoryIcon}
                status={status}
                isExpanded={false}
                isActive={isActive}
              />
              {isLoading ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 w-[14px] h-[14px] rounded-full bg-muted/40 overflow-hidden border border-border/20"
                >
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent" />
                </motion.div>
              ) : (
                status.count !== undefined &&
                status.count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className={cn(
                      'absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center',
                      'text-[9px] font-bold rounded-full border shadow-sm',
                      status.type === 'danger' &&
                        'bg-[hsl(var(--severity-critical))]/15 text-[hsl(var(--severity-critical))] border-[hsl(var(--severity-critical))]/25',
                      status.type === 'warning' &&
                        'bg-[hsl(var(--severity-medium))]/15 text-[hsl(var(--severity-medium))] border-[hsl(var(--severity-medium))]/25',
                      status.type === 'success' && 'bg-success/15 text-success border-success/25',
                      status.type === 'info' && 'bg-primary/15 text-primary border-primary/25',
                      status.type === 'neutral' && 'bg-muted text-muted-foreground border-border/50'
                    )}
                  >
                    {status.count > 99 ? '+' : status.count}
                  </motion.span>
                )
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            <span className="font-medium">{category.label}</span>
            {status.label && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] h-5',
                  status.type === 'success' && 'border-success/40 text-success bg-success/10',
                  status.type === 'warning' &&
                    'border-[hsl(var(--severity-medium))]/40 text-[hsl(var(--severity-medium))] bg-[hsl(var(--severity-medium))]/10',
                  status.type === 'danger' &&
                    'border-[hsl(var(--severity-critical))]/40 text-[hsl(var(--severity-critical))] bg-[hsl(var(--severity-critical))]/10',
                  status.type === 'info' && 'border-primary/40 text-primary bg-primary/10'
                )}
              >
                {status.count !== undefined && `${status.count} `}
                {status.label}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>

        {category.items.map((item) => (
          <NavItemCollapsed
            key={item.path}
            item={item}
            isActive={isItemActive(item.path)}
            onClick={onNavigate}
          />
        ))}
      </div>
    );
  })
);
