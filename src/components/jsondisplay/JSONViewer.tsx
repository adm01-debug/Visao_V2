import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface JSONViewerProps { data: unknown; initialExpanded?: boolean; className?: string; }

function JSONNode({ data, name, level, initialExpanded }: { data: unknown; name?: string; level: number; initialExpanded: boolean }) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const isObject = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);

  if (!isObject) {
    const color = typeof data === 'string' ? 'text-green-600' : typeof data === 'number' ? 'text-blue-600' : typeof data === 'boolean' ? 'text-purple-600' : 'text-gray-600';
    return <span><span className="text-foreground">{name && `"${name}": `}</span><span className={color}>{JSON.stringify(data)}</span></span>;
  }

  const entries = isArray ? (data as unknown[]).map((v, i) => [i, v]) : Object.entries(data as Record<string, unknown>);

  return (
    <div style={{ marginLeft: level > 0 ? 16 : 0 }}>
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1">
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>{name && `"${name}": `}{isArray ? '[' : '{'}</span>
        {!expanded && <span className="text-muted-foreground">...{entries.length} items</span>}
        {!expanded && <span>{isArray ? ']' : '}'}</span>}
      </button>
      {expanded && (
        <>
          {entries.map(([k, v], i) => <div key={i} className="ml-4"><JSONNode data={v} name={String(k)} level={level + 1} initialExpanded={level < 1} /></div>)}
          <div>{isArray ? ']' : '}'}</div>
        </>
      )}
    </div>
  );
}

export function JSONViewer({ data, initialExpanded = true, className }: JSONViewerProps) {
  return <div className={cn('p-4 rounded-lg border bg-muted/30 font-mono text-sm overflow-auto', className)}><JSONNode data={data} level={0} initialExpanded={initialExpanded} /></div>;
}

export default JSONViewer;
