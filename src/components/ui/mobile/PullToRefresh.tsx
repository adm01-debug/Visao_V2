/**
 * VISÃO - PullToRefresh Component
 * Pull-down gesture to trigger data refresh
 */
import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const threshold = 80;

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;
      if (containerRef.current?.scrollTop === 0) {
        startY.current = e.touches[0]!.clientY;
      }
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing || startY.current === 0) return;
      const currentY = e.touches[0]!.clientY;
      const diff = currentY - startY.current;
      if (diff > 0 && containerRef.current?.scrollTop === 0) {
        setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
      }
    },
    [disabled, isRefreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    startY.current = 0;
  }, [disabled, isRefreshing, pullDistance, onRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-10"
        style={{ top: pullDistance - 40 }}
        animate={{ opacity: progress }}
      >
        <motion.div
          className={cn(
            'w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center',
            isRefreshing && 'bg-primary/20'
          )}
          animate={{ rotate: isRefreshing ? 360 : progress * 180 }}
          transition={{
            rotate: isRefreshing
              ? { duration: 1, repeat: Infinity, ease: 'linear' }
              : { duration: 0.1 },
          }}
        >
          <RefreshCw className="w-5 h-5 text-primary" />
        </motion.div>
      </motion.div>

      <motion.div
        animate={{ y: pullDistance }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
