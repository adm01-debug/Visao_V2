import React from 'react';
import { cn } from '@/lib/utils';
import { FileText, Trash2, Download, Eye, MoreVertical } from 'lucide-react';

interface DocumentCardProps { name: string; type: string; size: string; date: Date; thumbnail?: string; onView?: () => void; onDownload?: () => void; onDelete?: () => void; className?: string; }

const typeColors: Record<string, string> = { pdf: 'bg-red-100 text-red-600', doc: 'bg-blue-100 text-blue-600', xls: 'bg-green-100 text-green-600', ppt: 'bg-orange-100 text-orange-600' };

export function DocumentCard({ name, type, size, date, thumbnail, onView, onDownload, onDelete, className }: DocumentCardProps) {
  return (
    <div className={cn('p-4 rounded-xl border bg-card group', className)}>
      <div className="flex items-start gap-3">
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', typeColors[type] || 'bg-gray-100 text-gray-600')}><FileText className="h-6 w-6" /></div>
        <div className="flex-1 min-w-0"><p className="font-medium truncate">{name}</p><p className="text-sm text-muted-foreground">{size} · {date.toLocaleDateString('pt-BR')}</p></div>
      </div>
      <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        {onView && <button onClick={onView} className="p-2 hover:bg-accent rounded"><Eye className="h-4 w-4" /></button>}
        {onDownload && <button onClick={onDownload} className="p-2 hover:bg-accent rounded"><Download className="h-4 w-4" /></button>}
        {onDelete && <button onClick={onDelete} className="p-2 hover:bg-accent rounded text-red-500"><Trash2 className="h-4 w-4" /></button>}
      </div>
    </div>
  );
}

export default DocumentCard;
