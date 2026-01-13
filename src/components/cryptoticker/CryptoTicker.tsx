import React from 'react';
import { cn } from '@/lib/utils';
import { Coins, TrendingUp, ArrowUpRight, Wallet } from 'lucide-react';

interface CryptoTickerProps { symbol: string; name: string; price: number; change24h: number; icon?: string; className?: string; }

export function CryptoTicker({ symbol, name, price, change24h, icon, className }: CryptoTickerProps) {
  const isPositive = change24h >= 0;
  return (
    <div className={cn('flex items-center gap-4 p-4 rounded-xl border bg-card', className)}>
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">{icon ? <img src={icon} alt="" className="w-6 h-6" /> : <Coins className="h-5 w-5" />}</div>
      <div className="flex-1"><p className="font-bold">{symbol}</p><p className="text-sm text-muted-foreground">{name}</p></div>
      <div className="text-right">
        <p className="font-bold">$ {price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        <p className={cn('text-sm flex items-center justify-end gap-1', isPositive ? 'text-green-500' : 'text-red-500')}>
          <ArrowUpRight className={cn('h-3 w-3', !isPositive && 'rotate-180')} />{Math.abs(change24h).toFixed(2)}%
        </p>
      </div>
    </div>
  );
}

export default CryptoTicker;
