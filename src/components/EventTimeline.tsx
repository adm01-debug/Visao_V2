import { 
  AlertTriangle, 
  Users, 
  Shield, 
  Activity,
  Clock,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimelineEvent {
  id: string;
  type: 'alert' | 'motion' | 'person' | 'security';
  title: string;
  description: string;
  timestamp: Date;
  thumbnail?: string;
}

interface EventTimelineProps {
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
}

const eventConfig = {
  alert: {
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/20',
    borderColor: 'border-destructive/50',
  },
  motion: {
    icon: Activity,
    color: 'text-warning',
    bgColor: 'bg-warning/20',
    borderColor: 'border-warning/50',
  },
  person: {
    icon: Users,
    color: 'text-primary',
    bgColor: 'bg-primary/20',
    borderColor: 'border-primary/50',
  },
  security: {
    icon: Shield,
    color: 'text-destructive',
    bgColor: 'bg-destructive/20',
    borderColor: 'border-destructive/50',
  },
};

const mockTimelineEvents: TimelineEvent[] = [
  {
    id: '1',
    type: 'alert',
    title: 'Colaborador sem EPI',
    description: 'Detectado funcionário sem capacete na área de produção',
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
  },
  {
    id: '2',
    type: 'person',
    title: '4 pessoas detectadas',
    description: 'Aglomeração identificada próximo à máquina 3',
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
  },
  {
    id: '3',
    type: 'motion',
    title: 'Movimento detectado',
    description: 'Atividade incomum na área de estoque',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: '4',
    type: 'security',
    title: 'Acesso não autorizado',
    description: 'Tentativa de acesso em porta restrita',
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
  },
  {
    id: '5',
    type: 'person',
    title: '2 pessoas detectadas',
    description: 'Entrada de colaboradores registrada',
    timestamp: new Date(Date.now() - 1000 * 60 * 35),
  },
];

export function EventTimeline({ 
  events = mockTimelineEvents, 
  onEventClick 
}: Partial<EventTimelineProps>) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Eventos Recentes</h3>
        <button className="text-xs text-primary hover:underline flex items-center gap-1">
          Ver todos <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

        {/* Events */}
        <div className="space-y-4">
          {events.map((event, index) => {
            const config = eventConfig[event.type];
            const Icon = config.icon;

            return (
              <div
                key={event.id}
                className={cn(
                  "relative pl-10 cursor-pointer group animate-fade-in",
                )}
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => onEventClick?.(event)}
              >
                {/* Timeline dot */}
                <div className={cn(
                  "absolute left-2 w-5 h-5 rounded-full flex items-center justify-center z-10",
                  config.bgColor
                )}>
                  <Icon className={cn("w-3 h-3", config.color)} />
                </div>

                {/* Event card */}
                <div className={cn(
                  "glass-card p-3 border-l-2 transition-all duration-200 group-hover:border-l-primary",
                  config.borderColor
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                        {event.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {event.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(event.timestamp, { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
