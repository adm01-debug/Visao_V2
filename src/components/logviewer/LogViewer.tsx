import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Terminal, Search, Download, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
}

interface LogViewerProps {
  logs: LogEntry[];
  maxHeight?: string;
  onClear?: () => void;
  onDownload?: () => void;
  className?: string;
}

const levelColors = { info: 'text-blue-500', warn: 'text-yellow-500', error: 'text-red-500', debug: 'text-gray-500' };

export function LogViewer({ logs, maxHeight = '400px', onClear, onDownload, className }: LogViewerProps) {
  const [filter, setFilter] = useState('');
  const filtered = filter ? logs.filter(l => l.message.toLowerCase().includes(filter.toLowerCase())) : logs;

  return (
    <div className={cn('rounded-lg border bg-black text-white', className)}>
      <div className="flex items-center gap-2 p-2 border-b border-gray-700">
        <Terminal className="h-4 w-4" />
        <span className="text-sm font-medium">Logs</span>
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500" />
          <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar..." className="h-7 pl-7 bg-gray-900 border-gray-700 text-sm" />
        </div>
        {onDownload && <Button size="sm" variant="ghost" onClick={onDownload}><Download className="h-4 w-4" /></Button>}
        {onClear && <Button size="sm" variant="ghost" onClick={onClear}><Trash2 className="h-4 w-4" /></Button>}
      </div>
      <div className="font-mono text-xs p-2 overflow-auto" style={{ maxHeight }}>
        {filtered.map(log => (
          <div key={log.id} className="py-0.5">
            <span className="text-gray-500">[{log.timestamp.toLocaleTimeString('pt-BR')}]</span>
            <span className={cn('mx-1', levelColors[log.level])}>[{log.level.toUpperCase()}]</span>
            {log.source && <span className="text-purple-400">[{log.source}]</span>}
            <span className="ml-1">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LogViewer;
