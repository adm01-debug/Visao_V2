import React from 'react';
import { cn } from '@/lib/utils';
import { Bookmark, Trash2, Folder, ExternalLink } from 'lucide-react';

interface BookmarkItemProps { title: string; url: string; favicon?: string; folder?: string; createdAt?: Date; onDelete?: () => void; className?: string; }

export function BookmarkItem({ title, url, favicon, folder, createdAt, onDelete, className }: BookmarkItemProps) {
  const domain = new URL(url).hostname;
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-lg border bg-card group', className)}>
      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">{favicon ? <img src={favicon} className="w-5 h-5" /> : <Bookmark className="h-4 w-4" />}</div>
      <div className="flex-1 min-w-0">
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary truncate block">{title}</a>
        <p className="text-sm text-muted-foreground truncate">{domain}</p>
      </div>
      {folder && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Folder className="h-3 w-3" />{folder}</span>}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
        <a href={url} target="_blank" className="p-1.5 hover:bg-accent rounded"><ExternalLink className="h-4 w-4" /></a>
        {onDelete && <button onClick={onDelete} className="p-1.5 hover:bg-accent rounded text-red-500"><Trash2 className="h-4 w-4" /></button>}
      </div>
    </div>
  );
}

export default BookmarkItem;
