import React from 'react';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

interface RatingProps {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' };

export function Rating({ value, max = 5, onChange, readonly = false, size = 'md', className }: RatingProps) {
  return (
    <div className={cn('flex gap-1', className)}>
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(i + 1)}
          className={cn('transition-colors', !readonly && 'hover:scale-110 cursor-pointer')}
        >
          <Star className={cn(
            sizeClasses[size],
            i < value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          )} />
        </button>
      ))}
    </div>
  );
}

export default Rating;
