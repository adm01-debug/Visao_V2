import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface StatusBadge2Props { status: 'success' | 'error' | 'warning' | 'pending'; label?: string; size?: 'sm' | 'md' | 'lg'; className?: string; }

const config = {
  success: { icon: CheckCircle, bg: 'bg-green-100 text-green-700', label: 'Sucesso' },
  error: { icon: XCircle, bg: 'bg-red-100 text-red-700', label: 'Erro' },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-100 text-yellow-700', label: 'Atenção' },
  pending: { icon: Clock, bg: 'bg-blue-100 text-blue-700', label: 'Pendente' },
};

const sizes = { sm: 'text-xs px-2 py-0.5', md: 'text-sm px-2.5 py-1', lg: 'text-base px-3 py-1.5' };

export function StatusBadge2({ status, label, size = 'md', className }: StatusBadge2Props) {
  const { icon: Icon, bg, label: defaultLabel } = config[status];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full font-medium', bg, sizes[size], className)}>
      <Icon className="h-3.5 w-3.5" />{label || defaultLabel}
    </span>
  );
}

export default StatusBadge2;
