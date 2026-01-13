import React from 'react';
import { cn } from '@/lib/utils';

interface DiffViewerProps { oldText: string; newText: string; className?: string; }

export function DiffViewer({ oldText, newText, className }: DiffViewerProps) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  return (
    <div className={cn('rounded-lg border overflow-hidden font-mono text-sm', className)}>
      <div className="grid grid-cols-2">
        <div className="bg-red-50 border-r">
          <div className="px-4 py-2 bg-red-100 border-b font-medium">Antigo</div>
          {oldLines.map((line, i) => (
            <div key={i} className={cn('px-4 py-1', !newLines.includes(line) && 'bg-red-100 text-red-700')}>
              <span className="text-muted-foreground mr-2">{i + 1}</span>{line}
            </div>
          ))}
        </div>
        <div className="bg-green-50">
          <div className="px-4 py-2 bg-green-100 border-b font-medium">Novo</div>
          {newLines.map((line, i) => (
            <div key={i} className={cn('px-4 py-1', !oldLines.includes(line) && 'bg-green-100 text-green-700')}>
              <span className="text-muted-foreground mr-2">{i + 1}</span>{line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DiffViewer;
