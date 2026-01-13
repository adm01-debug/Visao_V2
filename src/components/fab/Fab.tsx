import React from 'react';import { cn } from '@/lib/utils';import { Plus } from 'lucide-react';
interface Props { icon?: React.ReactNode; onClick?: () => void; position?: 'bottom-right' | 'bottom-left'; className?: string; }
const positions = { 'bottom-right': 'bottom-6 right-6', 'bottom-left': 'bottom-6 left-6' };
export function Fab({ icon, onClick, position = 'bottom-right', className }: Props) { return (<button onClick={onClick} className={cn('fixed w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-50 hover:scale-105 transition-transform', positions[position], className)}>{icon || <Plus className="h-6 w-6" />}</button>); }
export default Fab;