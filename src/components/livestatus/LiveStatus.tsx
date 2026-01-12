import React from 'react';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh } from 'lucide-react';

interface LiveStatusProps {
  isLive: boolean;
  signalStrength?: 'low' | 'medium' | 'high' | 'full';
  latency?: number;
  className?: string;
}

const signalIcons = { low: SignalLow, medium: SignalMedium, high: SignalHigh, full: Signal };

export function LiveStatus({ isLive, signalStrength = 'full', latency, className }: LiveStatusProps) {
  const SignalIcon = signalIcons[signalStrength];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
        isLive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
        {isLive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {isLive ? 'AO VIVO' : 'OFFLINE'}
      </div>
      {isLive && (
        <>
          <SignalIcon className={cn('h-4 w-4',
            signalStrength === 'low' ? 'text-red-500' :
            signalStrength === 'medium' ? 'text-yellow-500' : 'text-green-500')} />
          {latency !== undefined && <span className="text-xs text-muted-foreground">{latency}ms</span>}
        </>
      )}
    </div>
  );
}

export default LiveStatus;
