import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, ArrowDown } from 'lucide-react';

type NodeType = 'start' | 'end' | 'process' | 'decision' | 'io';
interface FlowNode { id: string; type: NodeType; text: string; }
interface FlowEdge { from: string; to: string; label?: string; }

interface FlowChartProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

const nodeStyles: Record<NodeType, string> = {
  start: 'rounded-full bg-green-500 text-white',
  end: 'rounded-full bg-red-500 text-white',
  process: 'rounded-lg bg-blue-500 text-white',
  decision: 'rotate-45 bg-yellow-500',
  io: 'skew-x-[-10deg] bg-purple-500 text-white',
};

export function FlowChart({ nodes, edges, direction = 'vertical', className }: FlowChartProps) {
  return (
    <div className={cn('p-4 overflow-auto', className)}>
      <div className={cn('flex gap-4', direction === 'vertical' ? 'flex-col items-center' : 'flex-row items-center')}>
        {nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            <div className={cn('px-4 py-2 min-w-[100px] text-center font-medium text-sm flex items-center justify-center', nodeStyles[node.type])}>
              <span className={node.type === 'decision' ? '-rotate-45' : ''}>{node.text}</span>
            </div>
            {i < nodes.length - 1 && (
              <div className="flex items-center justify-center">
                {direction === 'vertical' ? <ArrowDown className="h-6 w-6 text-muted-foreground" /> : <ArrowRight className="h-6 w-6 text-muted-foreground" />}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default FlowChart;
