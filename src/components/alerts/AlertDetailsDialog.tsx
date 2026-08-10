import { Camera, Check, EyeOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { AlertRecord } from './AlertTypes';
import { severityConfig, typeConfig } from './AlertTypes';

interface AlertDetailsDialogProps {
  alert: AlertRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}

export function AlertDetailsDialog({
  alert,
  isOpen,
  onClose,
  onMarkRead,
  onDelete,
}: AlertDetailsDialogProps) {
  if (!alert) return null;

  const severity =
    severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.low;
  const type = typeConfig[alert.type as keyof typeof typeConfig] || typeConfig.security;
  const TypeIcon = type.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className={cn('w-5 h-5', type.color)} />
            Detalhes do Alerta
          </DialogTitle>
          <DialogDescription>
            Criado em {new Date(alert.timestamp).toLocaleString('pt-BR')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className={cn('text-foreground', severity.color)}>{severity.label}</Badge>
            <Badge variant="outline" className={type.color}>
              {type.label}
            </Badge>
            {!alert.is_read && <Badge variant="secondary">Não lido</Badge>}
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Mensagem</h4>
            <p className="text-lg">{alert.message}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Câmera</h4>
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span>{alert.camera_name}</span>
            </div>
          </div>
          {alert.thumbnail && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Snapshot</h4>
              <img
                src={alert.thumbnail}
                alt="Snapshot do alerta"
                className="w-full rounded-lg border"
              />
            </div>
          )}
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onMarkRead}>
              {alert.is_read ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Marcar não lido
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Marcar como lido
                </>
              )}
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
