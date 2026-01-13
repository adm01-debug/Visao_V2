import React from 'react';
import { cn } from '@/lib/utils';
import { ThumbsUp, MessageCircle, Share2 } from 'lucide-react';

interface SocialPostProps { author: { name: string; handle: string; avatar?: string }; content: string; timestamp: Date; likes?: number; comments?: number; shares?: number; className?: string; }

export function SocialPost({ author, content, timestamp, likes = 0, comments = 0, shares = 0, className }: SocialPostProps) {
  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">{author.avatar ? <img src={author.avatar} className="w-full h-full rounded-full object-cover" /> : author.name[0]}</div>
        <div><p className="font-medium">{author.name}</p><p className="text-sm text-muted-foreground">@{author.handle} · {timestamp.toLocaleDateString('pt-BR')}</p></div>
      </div>
      <p className="mb-4">{content}</p>
      <div className="flex gap-6 text-muted-foreground">
        <button className="flex items-center gap-1 hover:text-primary"><ThumbsUp className="h-4 w-4" /><span className="text-sm">{likes}</span></button>
        <button className="flex items-center gap-1 hover:text-primary"><MessageCircle className="h-4 w-4" /><span className="text-sm">{comments}</span></button>
        <button className="flex items-center gap-1 hover:text-primary"><Share2 className="h-4 w-4" /><span className="text-sm">{shares}</span></button>
      </div>
    </div>
  );
}

export default SocialPost;
