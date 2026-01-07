import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Camera, 
  Bell, 
  User, 
  Shield, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Car
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// EVENT TYPES
// ============================================

export type EventType = 
  | 'camera_online'
  | 'camera_offline'
  | 'alert_triggered'
  | 'alert_resolved'
  | 'person_detected'
  | 'person_recognized'
  | 'vehicle_detected'
  | 'zone_breach'
  | 'system_update'
  | 'user_action';

export interface TimelineEvent {
  id: string;
  type: EventType;
  title: string;
  description?: string;
  timestamp: Date;
  metadata?: {
    cameraName?: string;
    personName?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    imageUrl?: string;
  };
}

// ============================================
// EVENT TIMELINE
// ============================================

interface EventTimelineProps {
  events: TimelineEvent[];
  className?: string;
  showConnector?: boolean;
  maxItems?: number;
}

export function EventTimeline({ 
  events, 
  className,
  showConnector = true,
  maxItems 
}: EventTimelineProps) {
  const displayEvents = maxItems ? events.slice(0, maxItems) : events;

  return (
    <div className={cn('relative', className)}>
      <AnimatePresence>
        {displayEvents.map((event, index) => (
          <TimelineItem
            key={event.id}
            event={event}
            isFirst={index === 0}
            isLast={index === displayEvents.length - 1}
            showConnector={showConnector}
            index={index}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// TIMELINE ITEM
// ============================================

interface TimelineItemProps {
  event: TimelineEvent;
  isFirst: boolean;
  isLast: boolean;
  showConnector: boolean;
  index: number;
}

function TimelineItem({ event, isFirst, isLast, showConnector, index }: TimelineItemProps) {
  const config = getEventConfig(event.type);
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="relative flex gap-4 pb-6 last:pb-0"
    >
      {/* Connector Line */}
      {showConnector && !isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border" />
      )}

      {/* Icon */}
      <div className={cn(
        'relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        config.bgColor
      )}>
        <Icon className={cn('w-4 h-4', config.iconColor)} />
        
        {/* Pulse for new events */}
        {isFirst && (
          <motion.div
            className={cn('absolute inset-0 rounded-full', config.bgColor)}
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm text-foreground">
              {event.title}
            </p>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {event.description}
              </p>
            )}
            {event.metadata?.cameraName && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Camera className="w-3 h-3" />
                {event.metadata.cameraName}
              </p>
            )}
          </div>

          <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(event.timestamp, { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </span>
        </div>

        {/* Severity Badge */}
        {event.metadata?.severity && (
          <div className="mt-2">
            <SeverityBadge severity={event.metadata.severity} />
          </div>
        )}

        {/* Thumbnail */}
        {event.metadata?.imageUrl && (
          <motion.div 
            className="mt-2 rounded-lg overflow-hidden w-32 h-20"
            whileHover={{ scale: 1.05 }}
          >
            <img 
              src={event.metadata.imageUrl} 
              alt="Event thumbnail"
              className="w-full h-full object-cover"
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// SEVERITY BADGE
// ============================================

interface SeverityBadgeProps {
  severity: 'low' | 'medium' | 'high' | 'critical';
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config = {
    low: { label: 'Baixa', color: 'bg-success/10 text-success border-success/30' },
    medium: { label: 'Média', color: 'bg-warning/10 text-warning border-warning/30' },
    high: { label: 'Alta', color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
    critical: { label: 'Crítica', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
      config[severity].color,
      className
    )}>
      {config[severity].label}
    </span>
  );
}

// ============================================
// COMPACT TIMELINE
// ============================================

interface CompactTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function CompactTimeline({ events, className }: CompactTimelineProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {events.slice(0, 5).map((event, index) => {
        const config = getEventConfig(event.type);
        const Icon = config.icon;

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg',
              'hover:bg-muted/50 transition-colors cursor-pointer'
            )}
          >
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
              config.bgColor
            )}>
              <Icon className={cn('w-3 h-3', config.iconColor)} />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">
                {event.title}
              </p>
            </div>

            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(event.timestamp, { locale: ptBR })}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getEventConfig(type: EventType) {
  const configs: Record<EventType, { 
    icon: React.ElementType; 
    bgColor: string; 
    iconColor: string;
  }> = {
    camera_online: {
      icon: Camera,
      bgColor: 'bg-success/20',
      iconColor: 'text-success',
    },
    camera_offline: {
      icon: Camera,
      bgColor: 'bg-destructive/20',
      iconColor: 'text-destructive',
    },
    alert_triggered: {
      icon: Bell,
      bgColor: 'bg-warning/20',
      iconColor: 'text-warning',
    },
    alert_resolved: {
      icon: CheckCircle,
      bgColor: 'bg-success/20',
      iconColor: 'text-success',
    },
    person_detected: {
      icon: User,
      bgColor: 'bg-primary/20',
      iconColor: 'text-primary',
    },
    person_recognized: {
      icon: Eye,
      bgColor: 'bg-primary/20',
      iconColor: 'text-primary',
    },
    vehicle_detected: {
      icon: Car,
      bgColor: 'bg-accent/20',
      iconColor: 'text-accent-foreground',
    },
    zone_breach: {
      icon: AlertTriangle,
      bgColor: 'bg-destructive/20',
      iconColor: 'text-destructive',
    },
    system_update: {
      icon: Shield,
      bgColor: 'bg-muted',
      iconColor: 'text-muted-foreground',
    },
    user_action: {
      icon: Activity,
      bgColor: 'bg-secondary/20',
      iconColor: 'text-secondary-foreground',
    },
  };

  return configs[type];
}
