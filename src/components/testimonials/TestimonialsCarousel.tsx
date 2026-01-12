import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Testimonial { id: string; text: string; author: string; role?: string; avatar?: string; }
interface TestimonialsCarouselProps { testimonials: Testimonial[]; autoPlay?: boolean; className?: string; }

export function TestimonialsCarousel({ testimonials, autoPlay = true, className }: TestimonialsCarouselProps) {
  const [current, setCurrent] = useState(0);

  React.useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => setCurrent(c => (c + 1) % testimonials.length), 5000);
    return () => clearInterval(timer);
  }, [autoPlay, testimonials.length]);

  const t = testimonials[current];

  return (
    <div className={cn('p-8 rounded-lg bg-card border text-center', className)}>
      <Quote className="h-8 w-8 mx-auto text-primary/20 mb-4" />
      <p className="text-lg mb-6 italic">&ldquo;{t.text}&rdquo;</p>
      <div className="flex items-center justify-center gap-3">
        {t.avatar && <img src={t.avatar} alt="" className="w-12 h-12 rounded-full" />}
        <div className="text-left"><p className="font-medium">{t.author}</p>{t.role && <p className="text-sm text-muted-foreground">{t.role}</p>}</div>
      </div>
      <div className="flex justify-center gap-2 mt-6">
        <Button variant="outline" size="icon" onClick={() => setCurrent(c => (c - 1 + testimonials.length) % testimonials.length)}><ChevronLeft className="h-4 w-4" /></Button>
        {testimonials.map((_, i) => <button key={i} onClick={() => setCurrent(i)} className={cn('w-2 h-2 rounded-full', i === current ? 'bg-primary' : 'bg-muted')} />)}
        <Button variant="outline" size="icon" onClick={() => setCurrent(c => (c + 1) % testimonials.length)}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export default TestimonialsCarousel;
