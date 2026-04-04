import { Lock, Camera, MapPin, ScanFace, User, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AccessEvent } from './SecurityTypes';

interface AccessEventsListProps {
  events: AccessEvent[];
}

function AccessEventCard({ event }: { event: AccessEvent }) {
  const isGranted = event.status === 'granted';
  const isDenied = event.status === 'denied';

  return (
    <div className={cn(
      'p-3 rounded-lg border-l-4 transition-colors',
      isGranted && 'border-l-green-500 bg-green-500/5',
      isDenied && 'border-l-red-500 bg-red-500/5',
      !isGranted && !isDenied && 'border-l-yellow-500 bg-yellow-500/5'
    )}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {event.personPhoto ? (
            <img src={event.personPhoto} alt={event.personName} className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{event.personName}</span>
            <Badge variant={isGranted ? 'default' : 'destructive'} className="text-xs">
              {isGranted ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
              {isGranted ? 'Liberado' : isDenied ? 'Negado' : 'Pendente'}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {event.cameraName && <span className="flex items-center gap-1"><Camera className="w-3 h-3" />{event.cameraName}</span>}
            {event.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>}
            {event.confidence && <span className="flex items-center gap-1"><ScanFace className="w-3 h-3" />{(event.confidence * 100).toFixed(0)}%</span>}
          </div>
          {event.reason && <p className="text-xs text-muted-foreground mt-1">{event.reason}</p>}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: ptBR })}
        </span>
      </div>
    </div>
  );
}

export function AccessEventsList({ events }: AccessEventsListProps) {
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Lock className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Nenhum evento de acesso registrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {events.map(event => <AccessEventCard key={event.id} event={event} />)}
    </div>
  );
}
