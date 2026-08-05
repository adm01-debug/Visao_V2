/**
 * VISÃO - Panic Event Detail Dialog
 */
import { CheckCircle2, MapPin, Phone, Mail, User, ExternalLink, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { PanicEvent } from '@/hooks/usePanicButton';

function StatusBadge({ resolved }: { resolved: boolean }) {
  return resolved ? (
    <Badge variant="secondary" className="gap-1">
      <CheckCircle2 className="w-3 h-3" />
      Resolvido
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1 animate-pulse">
      <ShieldAlert className="w-3 h-3" />
      Ativo
    </Badge>
  );
}

interface PanicEventDetailDialogProps {
  event: PanicEvent | null;
  onClose: () => void;
  onResolve: (event: PanicEvent) => void;
}

export function PanicEventDetailDialog({ event, onClose, onResolve }: PanicEventDetailDialogProps) {
  if (!event) return null;

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  return (
    <Dialog open={!!event} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive" />
            Detalhes do Evento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <StatusBadge resolved={event.resolved} />
            <span className="text-sm text-muted-foreground">
              {new Date(event.created_at).toLocaleString('pt-BR')}
            </span>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{event.user_name || 'N/A'}</span>
            </div>
            {event.user_email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{event.user_email}</span>
              </div>
            )}
            {event.user_phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{event.user_phone}</span>
              </div>
            )}
          </div>

          {event.latitude && event.longitude && (
            <div>
              <Label className="text-sm text-muted-foreground">Localização</Label>
              <Button
                variant="outline"
                size="sm"
                className="mt-1 gap-2 w-full justify-start"
                onClick={() => openGoogleMaps(event.latitude!, event.longitude!)}
              >
                <MapPin className="w-4 h-4" />
                {event.location_address ||
                  `${event.latitude.toFixed(6)}, ${event.longitude.toFixed(6)}`}
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Button>
            </div>
          )}

          {event.notes && (
            <div>
              <Label className="text-sm text-muted-foreground">Observações</Label>
              <p className="mt-1 text-sm bg-muted p-3 rounded-md">{event.notes}</p>
            </div>
          )}

          {event.resolved && (
            <div className="bg-muted/40 border border-border rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium text-foreground">✅ Resolvido</p>
              {event.resolved_by && (
                <p className="text-sm text-muted-foreground">Por: {event.resolved_by}</p>
              )}
              {event.resolved_at && (
                <p className="text-sm text-muted-foreground">
                  Em: {new Date(event.resolved_at).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!event.resolved && (
            <Button onClick={() => onResolve(event)} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Resolver Incidente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
