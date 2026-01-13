import React from 'react';import { cn } from '@/lib/utils';interface CEPFormatProps { value: string; className?: string; }
export function CEPFormat({ value, className }: CEPFormatProps) { const clean = value.replace(/\D/g, '').slice(0, 8); const formatted = clean.replace(/(\d{5})(\d{3})/, '$1-$2'); return <span className={cn('font-mono', className)}>{formatted}</span>; }
export default CEPFormat;