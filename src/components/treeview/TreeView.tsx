import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, Folder, FolderOpen, File } from 'lucide-react';

interface TreeNode { id: string; label: string; children?: TreeNode[]; icon?: React.ReactNode; }

interface TreeViewProps {
  data: TreeNode[];
  selectedId?: string;
  onSelect?: (node: TreeNode) => void;
  className?: string;
}

function TreeItem({ node, level, selectedId, onSelect, expanded, onToggle }: { node: TreeNode; level: number; selectedId?: string; onSelect?: (n: TreeNode) => void; expanded: Set<string>; onToggle: (id: string) => void }) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isSelected = node.id === selectedId;

  return (
    <div>
      <button onClick={() => { hasChildren ? onToggle(node.id) : onSelect?.(node); }}
        className={cn('w-full flex items-center gap-1 px-2 py-1 rounded hover:bg-accent text-left', isSelected && 'bg-primary/10')}
        style={{ paddingLeft: level * 16 + 8 }}>
        {hasChildren ? (
          <ChevronRight className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')} />
        ) : <span className="w-4" />}
        {node.icon || (hasChildren ? (isExpanded ? <FolderOpen className="h-4 w-4 text-yellow-500" /> : <Folder className="h-4 w-4 text-yellow-500" />) : <File className="h-4 w-4 text-muted-foreground" />)}
        <span className="text-sm ml-1">{node.label}</span>
      </button>
      {hasChildren && isExpanded && node.children!.map(child => (
        <TreeItem key={child.id} node={child} level={level + 1} selectedId={selectedId} onSelect={onSelect} expanded={expanded} onToggle={onToggle} />
      ))}
    </div>
  );
}

export function TreeView({ data, selectedId, onSelect, className }: TreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded(e => { const n = new Set(e); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className={cn('py-1', className)}>
      {data.map(node => <TreeItem key={node.id} node={node} level={0} selectedId={selectedId} onSelect={onSelect} expanded={expanded} onToggle={toggle} />)}
    </div>
  );
}

export default TreeView;
