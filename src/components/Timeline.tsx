/**
 * Timeline Component
 * Vertical/horizontal timeline for events and history
 */

import React from 'react';
import { cn } from '@/utils/cn';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Circle, Clock, AlertCircle, XCircle } from 'lucide-react';

export type TimelineItemStatus = 'completed' | 'current' | 'pending' | 'error' | 'warning';

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  date?: Date;
  status?: TimelineItemStatus;
  icon?: React.ReactNode;
  color?: string;
  content?: React.ReactNode;
  metadata?: Record<string, unknown>;
}

export interface TimelineProps {
  items: TimelineItem[];
  orientation?: 'vertical' | 'horizontal';
  alternating?: boolean;
  showConnector?: boolean;
  connectorStyle?: 'solid' | 'dashed' | 'dotted';
  animated?: boolean;
  className?: string;
  itemClassName?: string;
  onItemClick?: (item: TimelineItem) => void;
  renderItem?: (item: TimelineItem, index: number) => React.ReactNode;
  locale?: Locale;
}

const STATUS_ICONS: Record<TimelineItemStatus, React.ReactNode> = {
  completed: <Check className="h-4 w-4" />,
  current: <Circle className="h-4 w-4 fill-current" />,
  pending: <Clock className="h-4 w-4" />,
  error: <XCircle className="h-4 w-4" />,
  warning: <AlertCircle className="h-4 w-4" />,
};

const STATUS_COLORS: Record<TimelineItemStatus, string> = {
  completed: 'bg-green-500 text-white',
  current: 'bg-blue-500 text-white',
  pending: 'bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300',
  error: 'bg-red-500 text-white',
  warning: 'bg-yellow-500 text-white',
};

const TimelineItemComponent: React.FC<{
  item: TimelineItem;
  index: number;
  isLast: boolean;
  orientation: 'vertical' | 'horizontal';
  alternating: boolean;
  showConnector: boolean;
  connectorStyle: 'solid' | 'dashed' | 'dotted';
  animated: boolean;
  onItemClick?: (item: TimelineItem) => void;
  itemClassName?: string;
  locale: Locale;
}> = ({
  item,
  index,
  isLast,
  orientation,
  alternating,
  showConnector,
  connectorStyle,
  animated,
  onItemClick,
  itemClassName,
  locale,
}) => {
  const status = item.status || 'pending';
  const isAlternate = alternating && index % 2 === 1;

  const connectorClasses = cn(
    'absolute bg-border',
    connectorStyle === 'dashed' && 'border-dashed',
    connectorStyle === 'dotted' && 'border-dotted',
    orientation === 'vertical' 
      ? 'w-0.5 left-1/2 -translate-x-1/2 top-8 bottom-0' 
      : 'h-0.5 top-1/2 -translate-y-1/2 left-8 right-0'
  );

  if (orientation === 'horizontal') {
    return (
      <div
        className={cn(
          'timeline-item relative flex flex-col items-center',
          animated && 'animate-fade-in',
          itemClassName
        )}
        style={{ animationDelay: animated ? `${index * 100}ms` : undefined }}
        onClick={() => onItemClick?.(item)}
      >
        {/* Connector */}
        {showConnector && !isLast && (
          <div className={cn(connectorClasses, 'h-0.5 w-full top-4 left-1/2')} />
        )}

        {/* Icon */}
        <div
          className={cn(
            'relative z-10 w-8 h-8 rounded-full flex items-center justify-center',
            item.color || STATUS_COLORS[status],
            onItemClick && 'cursor-pointer hover:ring-2 ring-offset-2 transition-all'
          )}
        >
          {item.icon || STATUS_ICONS[status]}
        </div>

        {/* Content */}
        <div className="mt-3 text-center max-w-[150px]">
          <h4 className="text-sm font-medium">{item.title}</h4>
          {item.date && (
            <p className="text-xs text-muted-foreground mt-1">
              {format(item.date, 'dd/MM/yyyy HH:mm', { locale })}
            </p>
          )}
          {item.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {item.description}
            </p>
          )}
          {item.content}
        </div>
      </div>
    );
  }

  // Vertical orientation
  return (
    <div
      className={cn(
        'timeline-item relative',
        alternating && 'flex',
        isAlternate && 'flex-row-reverse',
        animated && 'animate-fade-in',
        itemClassName
      )}
      style={{ animationDelay: animated ? `${index * 100}ms` : undefined }}
    >
      {alternating && <div className="flex-1" />}

      {/* Content */}
      <div
        className={cn(
          alternating ? 'flex-1 px-6' : 'ml-12',
          isAlternate ? 'text-right' : 'text-left',
          onItemClick && 'cursor-pointer hover:bg-accent/50 rounded-lg transition-colors p-2 -m-2'
        )}
        onClick={() => onItemClick?.(item)}
      >
        <h4 className="text-sm font-medium">{item.title}</h4>
        {item.date && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(item.date, 'dd/MM/yyyy HH:mm', { locale })}
          </p>
        )}
        {item.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {item.description}
          </p>
        )}
        {item.content && (
          <div className="mt-2">{item.content}</div>
        )}
      </div>

      {/* Icon and Connector */}
      <div className={cn(
        'absolute flex flex-col items-center',
        alternating ? 'left-1/2 -translate-x-1/2' : 'left-0'
      )}>
        {/* Icon */}
        <div
          className={cn(
            'relative z-10 w-8 h-8 rounded-full flex items-center justify-center',
            item.color || STATUS_COLORS[status]
          )}
        >
          {item.icon || STATUS_ICONS[status]}
        </div>

        {/* Connector */}
        {showConnector && !isLast && (
          <div className={cn(
            'w-0.5 flex-1 min-h-[40px] bg-border mt-2',
            connectorStyle === 'dashed' && 'border-l-2 border-dashed bg-transparent border-border',
            connectorStyle === 'dotted' && 'border-l-2 border-dotted bg-transparent border-border'
          )} />
        )}
      </div>
    </div>
  );
};

export const Timeline: React.FC<TimelineProps> = ({
  items,
  orientation = 'vertical',
  alternating = false,
  showConnector = true,
  connectorStyle = 'solid',
  animated = false,
  className,
  itemClassName,
  onItemClick,
  renderItem,
  locale = ptBR,
}) => {
  return (
    <div
      className={cn(
        'timeline',
        orientation === 'horizontal' ? 'flex items-start gap-8 overflow-x-auto pb-4' : 'space-y-6',
        className
      )}
      role="list"
      aria-label="Timeline"
    >
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          {renderItem ? (
            renderItem(item, index)
          ) : (
            <TimelineItemComponent
              item={item}
              index={index}
              isLast={index === items.length - 1}
              orientation={orientation}
              alternating={alternating}
              showConnector={showConnector}
              connectorStyle={connectorStyle}
              animated={animated}
              onItemClick={onItemClick}
              itemClassName={itemClassName}
              locale={locale}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Timeline;
