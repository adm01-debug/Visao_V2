import React from 'react';
import { cn } from '@/lib/utils';

interface BulletGraphProps { value: number; target: number; max: number; label: string; className?: string; }

export function BulletGraph({ value, target, max, label, className }: BulletGraphProps) {
  const valuePercent = (value / max) * 100;
  const targetPercent = (target / max) * 100;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-sm"><span className="font-medium">{label}</span><span>{value} / {max}</span></div>
      <div className="relative h-6 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 rounded">
        <div className="absolute top-0 left-0 h-full bg-gray-700 rounded" style={{ width: `${valuePercent}%`, opacity: 0.8 }} />
        <div className="absolute top-0 h-full w-0.5 bg-black" style={{ left: `${targetPercent}%` }} />
      </div>
    </div>
  );
}

export default BulletGraph;
