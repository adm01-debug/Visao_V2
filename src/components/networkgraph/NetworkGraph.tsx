import React from 'react';
import { cn } from '@/lib/utils';

interface Node { id: string; label: string; x: number; y: number; }
interface Edge { from: string; to: string; }
interface NetworkGraphProps { nodes: Node[]; edges: Edge[]; width?: number; height?: number; className?: string; }

export function NetworkGraph({ nodes, edges, width = 400, height = 300, className }: NetworkGraphProps) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <svg width={width} height={height} className={cn('bg-muted/30 rounded-lg', className)}>
      {edges.map((e, i) => {
        const from = nodeMap[e.from];
        const to = nodeMap[e.to];
        return from && to ? <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#94a3b8" strokeWidth="2" /> : null;
      })}
      {nodes.map(n => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r="20" fill="#3b82f6" />
          <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="10" fill="white">{n.label}</text>
        </g>
      ))}
    </svg>
  );
}

export default NetworkGraph;
