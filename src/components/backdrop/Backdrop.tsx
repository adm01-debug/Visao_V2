import React from 'react';import { cn } from '@/lib/utils';interface BackdropProps { open: boolean; onClick?: () => void; className?: string; }
export function Backdrop({ open, onClick, className }: BackdropProps) { if (!open) return null; return <div onClick={onClick} className={cn('fixed inset-0 z-40 bg-black/50 animate-in fade-in', className)} />; }
export default Backdrop;