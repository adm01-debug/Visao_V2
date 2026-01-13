import React from 'react';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

interface StarRatingProps { value: number; onChange?: (value: number) => void; max?: number; size?: 'sm' | 'md' | 'lg'; readonly?: boolean; className?: string; }

const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };

export function StarRating({ value, onChange, max = 5, size = 'md', readonly = false, className }: StarRatingProps) {
  const [hover, setHover] = React.useState(0);

  return (
    <div className={cn('flex gap-1', className)}>
      {Array.from({ length: max }, (_, i) => i + 1).map(star => (
        <button key={star} disabled={readonly} onClick={() => onChange?.(star)} onMouseEnter={() => !readonly && setHover(star)} onMouseLeave={() => setHover(0)}>
          <Star className={cn(sizes[size], 'transition-colors', (hover || value) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300')} />
        </button>
      ))}
    </div>
  );
}

export default StarRating;
