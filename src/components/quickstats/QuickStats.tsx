import React from 'react';
import { cn } from '@/lib/utils';
import { Users, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';

interface QuickStatsProps { visitors: number; revenue: number; orders: number; conversion: number; className?: string; }

export function QuickStats({ visitors, revenue, orders, conversion, className }: QuickStatsProps) {
  return (
    <div className={cn('grid grid-cols-4 gap-4', className)}>
      <div className="p-4 rounded-xl border bg-card"><Users className="h-6 w-6 text-blue-500 mb-2" /><p className="text-2xl font-bold">{visitors.toLocaleString()}</p><p className="text-sm text-muted-foreground">Visitantes</p></div>
      <div className="p-4 rounded-xl border bg-card"><DollarSign className="h-6 w-6 text-green-500 mb-2" /><p className="text-2xl font-bold">R$ {revenue.toLocaleString()}</p><p className="text-sm text-muted-foreground">Receita</p></div>
      <div className="p-4 rounded-xl border bg-card"><ShoppingBag className="h-6 w-6 text-purple-500 mb-2" /><p className="text-2xl font-bold">{orders}</p><p className="text-sm text-muted-foreground">Pedidos</p></div>
      <div className="p-4 rounded-xl border bg-card"><TrendingUp className="h-6 w-6 text-orange-500 mb-2" /><p className="text-2xl font-bold">{conversion}%</p><p className="text-sm text-muted-foreground">Conversão</p></div>
    </div>
  );
}

export default QuickStats;
