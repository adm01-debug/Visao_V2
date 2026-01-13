import React from 'react';import { cn } from '@/lib/utils';interface ScrimProps { intensity?: 'light' | 'medium' | 'heavy'; className?: string; }
const intensities = { light: 'bg-black/25', medium: 'bg-black/50', heavy: 'bg-black/75' };
export function Scrim({ intensity = 'medium', className }: ScrimProps) { return <div className={cn('absolute inset-0', intensities[intensity], className)} />; }
export default Scrim;