import React from 'react';
import { cn } from '@/lib/utils';
import { Bookmark, BookmarkCheck, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CollectionCardProps { name: string; itemCount: number; thumbnail?: string; bookmarked?: boolean; onBookmark?: () => void; onAdd?: () => void; className?: string; }

export function CollectionCard({ name, itemCount, thumbnail, bookmarked, onBookmark, onAdd, className }: CollectionCardProps) {
  return (
    <div className={cn('rounded-xl border bg-card overflow-hidden group', className)}>
      <div className="relative h-32 bg-muted">{thumbnail && <img src={thumbnail} alt="" className="w-full h-full object-cover" />}<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" /><div className="absolute bottom-3 left-3 right-3"><h3 className="font-bold text-white">{name}</h3><p className="text-sm text-white/80">{itemCount} itens</p></div></div>
      <div className="p-3 flex gap-2">
        <Button variant="ghost" size="sm" onClick={onBookmark}>{bookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}</Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={onAdd}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
      </div>
    </div>
  );
}

export default CollectionCard;
