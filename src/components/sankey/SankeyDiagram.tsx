import React from 'react';
import { cn } from '@/lib/utils';

interface Flow { from: string; to: string; value: number; }
interface SankeyDiagramProps { flows: Flow[]; className?: string; }

export function SankeyDiagram({ flows, className }: SankeyDiagramProps) {
  const nodes = [...new Set([...flows.map(f => f.from), ...flows.map(f => f.to)])];
  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#ec4899'];

  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex justify-between mb-4">
        <div className="space-y-2">{nodes.filter(n => flows.some(f => f.from === n)).map((n, i) => (
          <div key={n} className="px-3 py-2 rounded text-sm text-white" style={{backgroundColor: colors[i % colors.length]}}>{n}</div>
        ))}</div>
        <div className="space-y-2">{nodes.filter(n => flows.some(f => f.to === n)).map((n, i) => (
          <div key={n} className="px-3 py-2 rounded text-sm text-white" style={{backgroundColor: colors[(i+3) % colors.length]}}>{n}</div>
        ))}</div>
      </div>
      <div className="text-xs text-muted-foreground">{flows.map((f, i) => <span key={i} className="mr-2">{f.from}→{f.to}: {f.value}</span>)}</div>
    </div>
  );
}

export default SankeyDiagram;
