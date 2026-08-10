/**
 * VISÃO - Animated Category Icon Component
 * Premium micro-interactions with glow, scale and spring physics
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CategoryStatus } from '../types';

interface AnimatedCategoryIconProps {
  icon: LucideIcon;
  status: CategoryStatus;
  isExpanded: boolean;
  isActive: boolean;
}

const statusColors = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-primary',
  neutral: 'text-muted-foreground',
};

const pulseColors = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-primary',
  neutral: 'bg-muted-foreground',
};

const glowShadows = {
  success: '0 0 8px hsl(var(--success) / 0.4)',
  warning: '0 0 8px hsl(var(--warning) / 0.4)',
  danger: '0 0 8px hsl(var(--destructive) / 0.4)',
  info: '0 0 8px hsl(var(--primary) / 0.4)',
  neutral: 'none',
};

export const AnimatedCategoryIcon = memo(
  React.forwardRef(function AnimatedCategoryIcon(
    { icon: Icon, status, isExpanded, isActive }: AnimatedCategoryIconProps,
    _ref
  ) {
    return (
      <motion.div
        className="relative"
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      >
        <motion.div
          animate={{
            scale: isExpanded ? 1.12 : 1,
            rotate: isExpanded ? 8 : 0,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          style={{
            filter: isActive
              ? `drop-shadow(${glowShadows[status.type === 'neutral' ? 'info' : status.type]})`
              : 'none',
          }}
        >
          <Icon
            className={cn(
              'h-4 w-4 transition-colors duration-300',
              isActive ? 'text-primary' : statusColors[status.type]
            )}
          />
        </motion.div>

        {/* Status Pulse Indicator — enhanced with layered rings */}
        {status.pulse && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className={cn(
              'absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full',
              pulseColors[status.type]
            )}
          >
            <span
              className={cn(
                'absolute inset-0 rounded-full animate-ping opacity-75',
                pulseColors[status.type]
              )}
            />
            <span
              className={cn(
                'absolute -inset-0.5 rounded-full animate-pulse opacity-30',
                pulseColors[status.type]
              )}
            />
          </motion.span>
        )}
      </motion.div>
    );
  })
);
