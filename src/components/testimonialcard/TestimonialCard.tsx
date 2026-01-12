import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/media/Avatar';
import { Star } from 'lucide-react';

interface TestimonialCardProps {
  content: string;
  author: { name: string; role?: string; avatar?: string };
  rating?: number;
  className?: string;
}

export function TestimonialCard({ content, author, rating, className }: TestimonialCardProps) {
  return (
    <div className={cn('p-6 rounded-lg border bg-card', className)}>
      {rating && (
        <div className="flex gap-0.5 mb-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={cn('h-4 w-4', i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted')} />
          ))}
        </div>
      )}
      <blockquote className="text-sm mb-4">"{content}"</blockquote>
      <div className="flex items-center gap-3">
        <Avatar src={author.avatar} name={author.name} size="sm" />
        <div>
          <p className="font-medium text-sm">{author.name}</p>
          {author.role && <p className="text-xs text-muted-foreground">{author.role}</p>}
        </div>
      </div>
    </div>
  );
}

export default TestimonialCard;
