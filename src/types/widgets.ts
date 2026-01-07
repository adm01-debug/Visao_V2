export type WidgetType = 
  | 'cameras-grid'
  | 'alerts-list'
  | 'stats-overview'
  | 'camera-map'
  | 'alerts-chart'
  | 'activity-feed'
  | 'quick-actions'
  | 'people-count'
  | 'system-health';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  description: string;
  icon: string;
  defaultSize: WidgetSize;
  minSize?: WidgetSize;
  maxSize?: WidgetSize;
}

export interface WidgetSize {
  cols: number;
  rows: number;
}

export interface WidgetInstance {
  id: string;
  widgetId: string;
  type: WidgetType;
  position: { x: number; y: number };
  size: WidgetSize;
  settings?: Record<string, unknown>;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: WidgetInstance[];
  columns: number;
  createdAt: string;
  updatedAt: string;
}

export const WIDGET_CATALOG: WidgetConfig[] = [
  {
    id: 'cameras-grid',
    type: 'cameras-grid',
    title: 'Grade de Câmeras',
    description: 'Visualização em grade das câmeras ativas',
    icon: '📹',
    defaultSize: { cols: 2, rows: 2 },
  },
  {
    id: 'alerts-list',
    type: 'alerts-list',
    title: 'Lista de Alertas',
    description: 'Alertas recentes do sistema',
    icon: '🔔',
    defaultSize: { cols: 1, rows: 2 },
  },
  {
    id: 'stats-overview',
    type: 'stats-overview',
    title: 'Estatísticas',
    description: 'Métricas principais do sistema',
    icon: '📊',
    defaultSize: { cols: 2, rows: 1 },
  },
  {
    id: 'camera-map',
    type: 'camera-map',
    title: 'Mapa de Câmeras',
    description: 'Localização geográfica das câmeras',
    icon: '🗺️',
    defaultSize: { cols: 2, rows: 2 },
  },
  {
    id: 'alerts-chart',
    type: 'alerts-chart',
    title: 'Gráfico de Alertas',
    description: 'Tendências de alertas ao longo do tempo',
    icon: '📈',
    defaultSize: { cols: 2, rows: 1 },
  },
  {
    id: 'activity-feed',
    type: 'activity-feed',
    title: 'Feed de Atividades',
    description: 'Últimas atividades detectadas',
    icon: '⚡',
    defaultSize: { cols: 1, rows: 2 },
  },
  {
    id: 'quick-actions',
    type: 'quick-actions',
    title: 'Ações Rápidas',
    description: 'Atalhos para ações comuns',
    icon: '🚀',
    defaultSize: { cols: 1, rows: 1 },
  },
  {
    id: 'people-count',
    type: 'people-count',
    title: 'Contagem de Pessoas',
    description: 'Total de pessoas detectadas',
    icon: '👥',
    defaultSize: { cols: 1, rows: 1 },
  },
  {
    id: 'system-health',
    type: 'system-health',
    title: 'Saúde do Sistema',
    description: 'Status dos componentes',
    icon: '💚',
    defaultSize: { cols: 1, rows: 1 },
  },
];

export const DEFAULT_LAYOUT: DashboardLayout = {
  id: 'default',
  name: 'Layout Padrão',
  columns: 4,
  widgets: [
    { id: '1', widgetId: 'stats-overview', type: 'stats-overview', position: { x: 0, y: 0 }, size: { cols: 4, rows: 1 } },
    { id: '2', widgetId: 'cameras-grid', type: 'cameras-grid', position: { x: 0, y: 1 }, size: { cols: 2, rows: 2 } },
    { id: '3', widgetId: 'alerts-list', type: 'alerts-list', position: { x: 2, y: 1 }, size: { cols: 1, rows: 2 } },
    { id: '4', widgetId: 'activity-feed', type: 'activity-feed', position: { x: 3, y: 1 }, size: { cols: 1, rows: 2 } },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
