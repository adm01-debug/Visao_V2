/**
 * VISÃO - Category Status Indicator Component
 * Premium badge micro-interactions with spring physics and shimmer
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CategoryStatus } from '../types';

interface CategoryStatusIndicatorProps {
  status: CategoryStatus;
  collapsed: boolean;
}

const statusConfig = {
  success: {
    bg: 'bg-success/12',
    text: 'text-success',
    border: 'border-success/25',
    dot: 'bg-success',
  },
  warning: {
    bg: 'bg-[hsl(var(--severity-medium))]/12',
    text: 'text-[hsl(var(--severity-medium))]',
    border: 'border-[hsl(var(--severity-medium))]/25',
    dot: 'bg-[hsl(var(--severity-medium))]',
  },
  danger: {
    bg: 'bg-[hsl(var(--severity-critical))]/12',
    text: 'text-[hsl(var(--severity-critical))]',
    border: 'border-[hsl(var(--severity-critical))]/25',
    dot: 'bg-[hsl(var(--severity-critical))]',
  },
  info: {
    bg: 'bg-primary/12',
    text: 'text-primary',
    border: 'border-primary/25',
    dot: 'bg-primary',
  },
  neutral: {
    bg: 'bg-muted/60',
    text: 'text-muted-foreground',
    border: 'border-border/50',
    dot: 'bg-muted-foreground',
  },
};

export const CategoryStatusIndicator = memo(
  React.forwardRef(function CategoryStatusIndicator(
    { status, collapsed }: CategoryStatusIndicatorProps,
    _ref
  ) {
    const config = statusConfig[status.type];

    if (collapsed) {
      return status.count !== undefined && status.count > 0 ? (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          className={cn(
            'absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center',
            'text-[10px] font-bold rounded-full shadow-sm',
            config.bg,
            config.text,
            'border',
            config.border
          )}
        >
          {status.count > 99 ? '99+' : status.count}
        </motion.span>
      ) : null;
    }

    return (
      <motion.div
        initial={{ opacity: 0, x: -10, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -10, scale: 0.8 }}
        whileHover={{ scale: 1.08, y: -1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium',
          'border backdrop-blur-sm cursor-default',
          'transition-shadow duration-300',
          config.bg,
          config.text,
          config.border
        )}
      >
        {/* Animated dot */}
        {status.count !== undefined && status.count > 0 && (
          <motion.span
            className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)}
            animate={status.type === 'danger' ? { scale: [1, 1.4, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          />
        )}
        {status.count !== undefined && <span className="font-bold">{status.count}</span>}
        <span className="truncate max-w-[60px]">{status.label}</span>
      </motion.div>
    );
  })
);
