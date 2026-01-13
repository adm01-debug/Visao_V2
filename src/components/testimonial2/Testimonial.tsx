import React from 'react';
import { cn } from '@/lib/utils';
import { Star, Quote } from 'lucide-react';

interface TestimonialProps { quote: string; author: string; role?: string; company?: string; rating?: number; avatar?: string; className?: string; }

export function Testimonial({ quote, author, role, company, rating, avatar, className }: TestimonialProps) {
  return (
    <div className={cn('p-6 rounded-xl border bg-card', className)}>
      <Quote className="h-8 w-8 text-primary/30 mb-4" />
      <p className="text-lg mb-4">{quote}</p>
      {rating && <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={cn('h-4 w-4', i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300')} />)}</div>}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">{avatar ? <img src={avatar} className="w-full h-full rounded-full object-cover" /> : author[0]}</div>
        <div><p className="font-medium">{author}</p>{(role || company) && <p className="text-sm text-muted-foreground">{role}{role && company && ' · '}{company}</p>}</div>
      </div>
    </div>
  );
}

export default Testimonial;
