import React from 'react';
import { cn } from '@/lib/utils';
import { Calendar, Clock, MapPin, Camera, User, Tag, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface EventDetailCardProps {
  title: string;
  type: string;
  timestamp: Date;
  camera?: string;
  location?: string;
  assignee?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  thumbnail?: string;
  onView?: () => void;
  onAssign?: () => void;
  onResolve?: () => void;
  className?: string;
}

const severityColors = { low: 'bg-gray-100', medium: 'bg-yellow-100', high: 'bg-orange-100', critical: 'bg-red-100' };
const severityText = { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' };

export function EventDetailCard({ title, type, timestamp, camera, location, assignee, severity, thumbnail, onView, onAssign, onResolve, className }: EventDetailCardProps) {
  return (
    <div className={cn('rounded-lg border overflow-hidden', severityColors[severity], className)}>
      {thumbnail && <div className="h-40 bg-black"><img src={thumbnail} alt="" className="w-full h-full object-cover" /></div>}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium">{title}</h3>
          <Badge variant={severity === 'critical' ? 'destructive' : severity === 'high' ? 'default' : 'secondary'}>{severityText[severity]}</Badge>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground mb-3">
          <p className="flex items-center gap-2"><Tag className="h-4 w-4" />{type}</p>
          <p className="flex items-center gap-2"><Calendar className="h-4 w-4" />{timestamp.toLocaleDateString('pt-BR')}</p>
          <p className="flex items-center gap-2"><Clock className="h-4 w-4" />{timestamp.toLocaleTimeString('pt-BR')}</p>
          {camera && <p className="flex items-center gap-2"><Camera className="h-4 w-4" />{camera}</p>}
          {location && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{location}</p>}
          {assignee && <p className="flex items-center gap-2"><User className="h-4 w-4" />{assignee}</p>}
        </div>
        <div className="flex gap-2">
          {onView && <Button size="sm" variant="outline" onClick={onView}>Ver Detalhes</Button>}
          {onAssign && !assignee && <Button size="sm" variant="outline" onClick={onAssign}>Atribuir</Button>}
          {onResolve && <Button size="sm" onClick={onResolve}>Resolver</Button>}
        </div>
      </div>
    </div>
  );
}

export default EventDetailCard;
