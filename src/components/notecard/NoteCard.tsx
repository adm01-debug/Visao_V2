import React from 'react';
import { cn } from '@/lib/utils';
import { MoreVertical, Pin, Archive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NoteCardProps { title: string; content: string; date: Date; color?: string; pinned?: boolean; onPin?: () => void; onArchive?: () => void; onDelete?: () => void; className?: string; }

export function NoteCard({ title, content, date, color = '#fff', pinned, onPin, onArchive, onDelete, className }: NoteCardProps) {
  return (
    <div className={cn('p-4 rounded-xl border shadow-sm group', className)} style={{ backgroundColor: color }}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium line-clamp-1">{title}</h3>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button onClick={onPin} className={cn('p-1 hover:bg-black/10 rounded', pinned && 'text-primary')}><Pin className="h-4 w-4" /></button>
          <button onClick={onArchive} className="p-1 hover:bg-black/10 rounded"><Archive className="h-4 w-4" /></button>
          <button onClick={onDelete} className="p-1 hover:bg-black/10 rounded text-red-500"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{content}</p>
      <p className="text-xs text-muted-foreground">{date.toLocaleDateString('pt-BR')}</p>
    </div>
  );
}

export default NoteCard;
