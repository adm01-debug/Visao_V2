/**
 * VISÃO - Stat Card Component
 */
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; direction: 'up' | 'down' };
  color?: 'primary' | 'success' | 'warning' | 'destructive';
  className?: string;
}

const colorClasses = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

export function StatCard({
  label,
  value,
  icon,
  trend,
  color = 'primary',
  className,
}: StatCardProps) {
  return (
    <motion.div
      className={cn(
        'p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow',
        className
      )}
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {label}
          </p>
          <motion.p
            className="text-2xl font-bold mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={value}
          >
            {value}
          </motion.p>
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 mt-1 text-xs font-medium',
                trend.direction === 'up' ? 'text-success' : 'text-destructive'
              )}
            >
              <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">vs ontem</span>
            </div>
          )}
        </div>
        <div className={cn('p-2 rounded-lg', colorClasses[color])}>{icon}</div>
      </div>
    </motion.div>
  );
}
