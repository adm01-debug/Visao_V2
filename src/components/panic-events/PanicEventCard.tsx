/**
 * VISÃO - Panic Event Card
 */
import {
  AlertTriangle, CheckCircle2, Clock, MapPin, Phone, Mail, User, ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

interface PanicEventCardProps {
  event: PanicEvent;
  onClick: (event: PanicEvent) => void;
  onResolve: (event: PanicEvent) => void;
}

export function PanicEventCard({ event, onClick, onResolve }: PanicEventCardProps) {
  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        !event.resolved ? 'border-destructive/30 bg-destructive/5' : ''
      }`}
      onClick={() => onClick(event)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`p-2 rounded-full mt-0.5 ${event.resolved ? 'bg-secondary' : 'bg-destructive/10'}`}>
              {event.resolved ? (
                <CheckCircle2 className="w-5 h-5 text-secondary-foreground" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{event.user_name || 'Usuário'}</span>
                <StatusBadge resolved={event.resolved} />
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                {event.user_email && (
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{event.user_email}</span>
                )}
                {event.user_phone && (
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{event.user_phone}</span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
              {event.location_address && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />{event.location_address}
                </p>
              )}
              {event.latitude && event.longitude && !event.location_address && (
                <button
                  className="text-sm text-primary mt-1 flex items-center gap-1 hover:underline"
                  onClick={(e) => { e.stopPropagation(); openGoogleMaps(event.latitude!, event.longitude!); }}
                >
                  <MapPin className="w-3 h-3" />
                  {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {!event.resolved && (
            <Button
              size="sm" variant="outline" className="flex-shrink-0 gap-1"
              onClick={(e) => { e.stopPropagation(); onResolve(event); }}
            >
              <CheckCircle2 className="w-4 h-4" />Resolver
            </Button>
          )}
        </div>

        {event.resolved && event.resolved_by && (
          <div className="mt-3 pt-3 border-t text-sm text-muted-foreground flex items-center gap-4">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />Resolvido por: {event.resolved_by}</span>
            {event.resolved_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(event.resolved_at), { addSuffix: true, locale: ptBR })}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
