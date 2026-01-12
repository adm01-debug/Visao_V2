import React from 'react';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

interface RatingInputProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
  className?: string;
}

const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' };

export function RatingInput({ value, onChange, max = 5, size = 'md', readOnly = false, className }: RatingInputProps) {
  const [hover, setHover] = React.useState(0);

  return (
    <div className={cn('flex gap-1', className)}>
      {Array.from({ length: max }, (_, i) => i + 1).map(star => (
        <button key={star} type="button" disabled={readOnly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={cn('transition-colors', readOnly ? 'cursor-default' : 'cursor-pointer')}>
          <Star className={cn(sizes[size], (hover || value) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300')} />
        </button>
      ))}
    </div>
  );
}

export default RatingInput;
