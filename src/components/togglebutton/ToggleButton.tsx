import React from 'react';import { cn } from '@/lib/utils';
interface Props { pressed: boolean; onToggle: () => void; children: React.ReactNode; className?: string; }
export function ToggleButton({ pressed, onToggle, children, className }: Props) { return (<button onClick={onToggle} className={cn('px-4 py-2 rounded-lg border transition-colors', pressed ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent', className)}>{children}</button>); }
export default ToggleButton;