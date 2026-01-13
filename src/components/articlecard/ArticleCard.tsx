import React from 'react';
import { cn } from '@/lib/utils';
import { Bookmark, Share2, MoreHorizontal, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ArticleCardProps { title: string; excerpt: string; author: { name: string; avatar?: string }; date: Date; readTime?: number; coverImage?: string; onBookmark?: () => void; onShare?: () => void; className?: string; }

export function ArticleCard({ title, excerpt, author, date, readTime, coverImage, onBookmark, onShare, className }: ArticleCardProps) {
  return (
    <div className={cn('rounded-xl border bg-card overflow-hidden', className)}>
      {coverImage && <img src={coverImage} alt="" className="w-full h-48 object-cover" />}
      <div className="p-5">
        <h3 className="text-lg font-bold mb-2 line-clamp-2">{title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{excerpt}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">{author.avatar ? <img src={author.avatar} className="w-full h-full rounded-full object-cover" /> : author.name[0]}</div>
            <div><p className="text-sm font-medium">{author.name}</p><p className="text-xs text-muted-foreground">{date.toLocaleDateString('pt-BR')} · {readTime || 5} min</p></div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onBookmark}><Bookmark className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={onShare}><Share2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArticleCard;
