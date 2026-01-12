import React from 'react';
import { cn } from '@/lib/utils';
import { Link2, LinkOff, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface IntegrationCardProps {
  name: string;
  description?: string;
  icon?: React.ReactNode;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSettings?: () => void;
  className?: string;
}

const statusConfig = {
  connected: { label: 'Conectado', variant: 'default' as const, color: 'text-green-500' },
  disconnected: { label: 'Desconectado', variant: 'secondary' as const, color: 'text-gray-500' },
  error: { label: 'Erro', variant: 'destructive' as const, color: 'text-red-500' }
};

export function IntegrationCard({ name, description, icon, status, lastSync, onConnect, onDisconnect, onSettings, className }: IntegrationCardProps) {
  const config = statusConfig[status];

  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted">{icon || <Link2 className="h-5 w-5" />}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{name}</h4>
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          {lastSync && status === 'connected' && (
            <p className="text-xs text-muted-foreground mt-1">Última sincronização: {lastSync.toLocaleString('pt-BR')}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        {status === 'disconnected' && onConnect && <Button size="sm" onClick={onConnect}><Link2 className="h-4 w-4 mr-1" />Conectar</Button>}
        {status === 'connected' && onDisconnect && <Button size="sm" variant="outline" onClick={onDisconnect}><LinkOff className="h-4 w-4 mr-1" />Desconectar</Button>}
        {onSettings && <Button size="sm" variant="ghost" onClick={onSettings}><Settings className="h-4 w-4" /></Button>}
      </div>
    </div>
  );
}

export default IntegrationCard;
