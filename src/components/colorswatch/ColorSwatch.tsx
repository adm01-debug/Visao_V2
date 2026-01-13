import React from 'react';
import { cn } from '@/lib/utils';

interface ColorSwatchProps { colors: string[]; selected?: string; onChange?: (color: string) => void; size?: 'sm' | 'md' | 'lg'; className?: string; }

const sizes = { sm: 'w-6 h-6', md: 'w-8 h-8', lg: 'w-10 h-10' };

export function ColorSwatch({ colors, selected, onChange, size = 'md', className }: ColorSwatchProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {colors.map(color => (
        <button key={color} onClick={() => onChange?.(color)} className={cn('rounded-full border-2 transition-transform hover:scale-110', sizes[size], selected === color ? 'border-foreground ring-2 ring-offset-2' : 'border-transparent')} style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

export default ColorSwatch;
