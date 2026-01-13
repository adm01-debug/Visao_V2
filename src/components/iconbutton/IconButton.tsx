import React from 'react';import { cn } from '@/lib/utils';
interface Props { icon: React.ReactNode; onClick?: () => void; variant?: 'default' | 'ghost' | 'outline'; size?: 'sm' | 'md' | 'lg'; className?: string; }
const variants = { default: 'bg-primary text-primary-foreground hover:bg-primary/90', ghost: 'hover:bg-accent', outline: 'border hover:bg-accent' };
const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' };
export function IconButton({ icon, onClick, variant = 'default', size = 'md', className }: Props) { return (<button onClick={onClick} className={cn('rounded-lg flex items-center justify-center', variants[variant], sizes[size], className)}>{icon}</button>); }
export default IconButton;