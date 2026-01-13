import React from 'react';
import { cn } from '@/lib/utils';
import { Star, ThumbsUp, Flag } from 'lucide-react';

interface ReviewCardProps { author: { name: string; avatar?: string }; rating: number; title?: string; content: string; date: Date; helpful?: number; verified?: boolean; className?: string; }

export function ReviewCard({ author, rating, title, content, date, helpful = 0, verified, className }: ReviewCardProps) {
  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">{author.avatar ? <img src={author.avatar} className="w-full h-full rounded-full object-cover" /> : author.name[0]}</div>
          <div><p className="font-medium">{author.name}</p><p className="text-xs text-muted-foreground">{date.toLocaleDateString('pt-BR')}</p></div>
        </div>
        <div className="flex items-center gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={cn('h-4 w-4', i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300')} />)}</div>
      </div>
      {verified && <span className="inline-flex items-center gap-1 text-xs text-green-600 mb-2">✓ Compra verificada</span>}
      {title && <h4 className="font-medium mb-1">{title}</h4>}
      <p className="text-sm text-muted-foreground mb-3">{content}</p>
      <div className="flex items-center gap-4 text-muted-foreground text-sm">
        <button className="flex items-center gap-1 hover:text-primary"><ThumbsUp className="h-4 w-4" />Útil ({helpful})</button>
        <button className="flex items-center gap-1 hover:text-primary"><Flag className="h-4 w-4" />Reportar</button>
      </div>
    </div>
  );
}

export default ReviewCard;
