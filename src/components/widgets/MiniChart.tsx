/**
 * VISÃO - Mini Chart Component
 */
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MiniChartProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}

export function MiniChart({ data, color = 'hsl(var(--primary))', height = 40, className }: MiniChartProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = ((max - value) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className={cn('w-full', className)} height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.path d={`M0,${height} L${points} L100,${height} Z`} fill="url(#chartGradient)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} />
      <motion.polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: 'easeOut' }} />
    </svg>
  );
}
