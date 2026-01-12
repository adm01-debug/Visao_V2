import React from 'react';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  latency?: number;
  lastConnected?: Date;
  onReconnect?: () => void;
  className?: string;
}

export function ConnectionStatus({ isConnected, latency, lastConnected, onReconnect, className }: ConnectionStatusProps) {
  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm', isConnected ? 'bg-green-50' : 'bg-red-50', className)}>
      {isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
      <span className={isConnected ? 'text-green-700' : 'text-red-700'}>{isConnected ? 'Conectado' : 'Desconectado'}</span>
      {isConnected && latency && <span className="text-muted-foreground ml-2">{latency}ms</span>}
      {!isConnected && lastConnected && <span className="text-xs text-muted-foreground ml-2">Última: {lastConnected.toLocaleTimeString('pt-BR')}</span>}
      {!isConnected && onReconnect && (
        <button onClick={onReconnect} className="ml-auto text-primary hover:underline flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />Reconectar
        </button>
      )}
    </div>
  );
}

export default ConnectionStatus;
