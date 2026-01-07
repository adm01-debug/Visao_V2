import React from 'react';
import { WidgetType, WidgetInstance, WIDGET_CATALOG } from '@/types/widgets';
import { WidgetWrapper } from './WidgetWrapper';
import { StatsWidget } from './StatsWidget';
import { CamerasGridWidget } from './CamerasGridWidget';
import { AlertsListWidget } from './AlertsListWidget';
import { ActivityFeedWidget } from './ActivityFeedWidget';
import { QuickActionsWidget } from './QuickActionsWidget';
import { PeopleCountWidget } from './PeopleCountWidget';
import { SystemHealthWidget } from './SystemHealthWidget';
import { AlertsChartWidget } from './AlertsChartWidget';
import { CameraMapWidget } from './CameraMapWidget';

interface WidgetRendererProps {
  widget: WidgetInstance;
  isEditing: boolean;
  onRemove: (id: string) => void;
  onResize: (id: string, size: { cols: number; rows: number }) => void;
}

export function WidgetRenderer({ 
  widget, 
  isEditing, 
  onRemove,
  onResize,
}: WidgetRendererProps) {
  const config = WIDGET_CATALOG.find(w => w.type === widget.type);
  if (!config) return null;

  const renderContent = () => {
    switch (widget.type) {
      case 'stats-overview':
        return <StatsWidget />;
      case 'cameras-grid':
        return <CamerasGridWidget />;
      case 'alerts-list':
        return <AlertsListWidget />;
      case 'activity-feed':
        return <ActivityFeedWidget />;
      case 'quick-actions':
        return <QuickActionsWidget />;
      case 'people-count':
        return <PeopleCountWidget />;
      case 'system-health':
        return <SystemHealthWidget />;
      case 'alerts-chart':
        return <AlertsChartWidget />;
      case 'camera-map':
        return <CameraMapWidget />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Widget não implementado
          </div>
        );
    }
  };

  return (
    <WidgetWrapper
      widget={widget}
      isEditing={isEditing}
      onRemove={() => onRemove(widget.id)}
      onResize={(size) => onResize(widget.id, size)}
      title={config.title}
      icon={config.icon}
    >
      {renderContent()}
    </WidgetWrapper>
  );
}
