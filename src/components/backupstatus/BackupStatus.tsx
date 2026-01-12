import React from 'react';
import { cn } from '@/lib/utils';
import { HardDrive, Cloud, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackupStatusProps {
  lastBackup?: Date;
  nextBackup?: Date;
  status: 'idle' | 'running' | 'success' | 'error';
  destination: 'local' | 'cloud';
  onBackupNow?: () => void;
  className?: string;
}

export function BackupStatus({ lastBackup, nextBackup, status, destination, onBackupNow, className }: BackupStatusProps) {
  const Icon = destination === 'cloud' ? Cloud : HardDrive;
  const StatusIcon = status === 'running' ? Loader2 : status === 'success' ? CheckCircle : status === 'error' ? XCircle : null;

  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-5 w-5 text-primary" />
        <span className="font-medium">Backup {destination === 'cloud' ? 'em Nuvem' : 'Local'}</span>
        {StatusIcon && <StatusIcon className={cn('h-4 w-4 ml-auto', status === 'running' && 'animate-spin', status === 'success' && 'text-green-500', status === 'error' && 'text-red-500')} />}
      </div>
      <div className="space-y-1 text-sm text-muted-foreground mb-3">
        {lastBackup && <p>Último: {lastBackup.toLocaleString('pt-BR')}</p>}
        {nextBackup && <p>Próximo: {nextBackup.toLocaleString('pt-BR')}</p>}
      </div>
      {onBackupNow && (
        <Button size="sm" variant="outline" onClick={onBackupNow} disabled={status === 'running'} className="w-full">
          {status === 'running' ? 'Executando...' : 'Backup Agora'}
        </Button>
      )}
    </div>
  );
}

export default BackupStatus;
