import React from 'react';
import { cn } from '@/lib/utils';

interface MindNode { id: string; text: string; children?: MindNode[]; color?: string; }

interface MindMapProps {
  data: MindNode;
  className?: string;
}

function MindBranch({ node, side }: { node: MindNode; side: 'left' | 'right' }) {
  return (
    <div className={cn('flex items-center gap-2', side === 'left' && 'flex-row-reverse')}>
      <div className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', node.color ? '' : 'bg-muted')} style={node.color ? { backgroundColor: node.color, color: 'white' } : {}}>{node.text}</div>
      {node.children && node.children.length > 0 && (
        <div className="flex flex-col gap-2">
          {node.children.map(child => <MindBranch key={child.id} node={child} side={side} />)}
        </div>
      )}
    </div>
  );
}

export function MindMap({ data, className }: MindMapProps) {
  const leftChildren = data.children?.filter((_, i) => i % 2 === 0) || [];
  const rightChildren = data.children?.filter((_, i) => i % 2 === 1) || [];

  return (
    <div className={cn('flex items-center justify-center gap-8 p-8 overflow-auto', className)}>
      <div className="flex flex-col gap-4">{leftChildren.map(c => <MindBranch key={c.id} node={c} side="left" />)}</div>
      <div className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg">{data.text}</div>
      <div className="flex flex-col gap-4">{rightChildren.map(c => <MindBranch key={c.id} node={c} side="right" />)}</div>
    </div>
  );
}

export default MindMap;
