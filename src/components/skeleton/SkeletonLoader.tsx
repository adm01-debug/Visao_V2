import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonLoaderProps { variant?: 'text' | 'circular' | 'rectangular'; width?: string | number; height?: string | number; className?: string; }

export function SkeletonLoader({ variant = 'rectangular', width, height, className }: SkeletonLoaderProps) {
  const baseClass = 'animate-pulse bg-muted';
  const variants = { text: 'rounded h-4', circular: 'rounded-full', rectangular: 'rounded-lg' };

  return <div aria-hidden="true" className={cn(baseClass, variants[variant], className)} style={{ width, height }} />;
}

export default SkeletonLoader;
