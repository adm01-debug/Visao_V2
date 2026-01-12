import React from 'react';
import { cn } from '@/lib/utils';
import { Download, FileText, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportProgressProps {
  filename: string;
  progress: number;
  status: 'preparing' | 'exporting' | 'completed' | 'error';
  size?: string;
  onCancel?: () => void;
  onDownload?: () => void;
  className?: string;
}

export function ExportProgress({ filename, progress, status, size, onCancel, onDownload, className }: ExportProgressProps) {
  const statusLabels = { preparing: 'Preparando...', exporting: 'Exportando...', completed: 'Concluído', error: 'Erro' };

  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-center gap-3 mb-3">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <div className="flex-1">
          <p className="font-medium text-sm">{filename}</p>
          <p className="text-xs text-muted-foreground">{statusLabels[status]}{size && ` • ${size}`}</p>
        </div>
        {status === 'completed' ? <Check className="h-5 w-5 text-green-500" /> : status === 'error' ? <X className="h-5 w-5 text-red-500" /> : null}
      </div>
      {(status === 'preparing' || status === 'exporting') && (
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="flex gap-2">
        {status === 'completed' && onDownload && <Button size="sm" onClick={onDownload}><Download className="h-4 w-4 mr-1" />Baixar</Button>}
        {(status === 'preparing' || status === 'exporting') && onCancel && <Button size="sm" variant="outline" onClick={onCancel}>Cancelar</Button>}
      </div>
    </div>
  );
}

export default ExportProgress;
