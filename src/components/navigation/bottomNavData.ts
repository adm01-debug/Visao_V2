import {
  Camera,
  Shield,
  Brain,
  Users,
  Settings,
  LayoutDashboard,
  Bell,
  Video,
  HardHat,
  BarChart3,
  ScanFace,
  Car,
  Flame,
  Target,
  Sliders,
  MessageSquare,
  ShieldAlert,
  Zap,
  FileText,
  PieChart,
  Wrench,
  Network,
  BellRing,
  CalendarClock,
  ClipboardCheck,
  Clock,
  Gauge,
  HeartPulse,
  ScanLine,
  Server,
  Terminal,
  Timer,
  type LucideIcon,
} from 'lucide-react';

import type { AppRole } from '@/hooks/useUserRole';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  minRole?: AppRole;
}

export interface NavCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  defaultPath: string;
  items: NavItem[];
  minRole?: AppRole;
}

export const allCategories: NavCategory[] = [
  {
    id: 'monitoring',
    label: 'Monitor',
    icon: Camera,
    defaultPath: '/dashboard',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { id: 'cameras', label: 'Câmeras', icon: Camera, path: '/cameras' },
      { id: 'recordings', label: 'Gravações', icon: Video, path: '/recordings' },
      { id: 'stream-health', label: 'Saúde', icon: HeartPulse, path: '/stream-health' },
      { id: 'bandwidth-monitor', label: 'Banda', icon: Gauge, path: '/bandwidth-monitor' },
      { id: 'motion-masks', label: 'Máscaras', icon: ScanLine, path: '/motion-masks' },
      { id: 'timelapse', label: 'Timelapse', icon: Timer, path: '/timelapse' },
      { id: 'schedules', label: 'Agenda', icon: CalendarClock, path: '/schedules' },
    ],
  },
  {
    id: 'security',
    label: 'Segurança',
    icon: Shield,
    defaultPath: '/alerts',
    items: [
      { id: 'alerts', label: 'Alertas', icon: Bell, path: '/alerts' },
      { id: 'panic', label: 'Pânico', icon: ShieldAlert, path: '/panic-events' },
      { id: 'rules', label: 'Regras', icon: Shield, path: '/security', minRole: 'manager' },
      {
        id: 'automation',
        label: 'Autom.',
        icon: Zap,
        path: '/automation-rules',
        minRole: 'manager',
      },
      { id: 'ppe', label: 'EPIs', icon: HardHat, path: '/ppe' },
      { id: 'event-alerts', label: 'Eventos', icon: BellRing, path: '/event-alerts' },
      { id: 'alerts-timeline', label: 'Timeline', icon: Clock, path: '/alerts-timeline' },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intel',
    icon: Brain,
    defaultPath: '/analytics',
    items: [
      { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
      {
        id: 'recognition-analytics',
        label: 'Rec. IA',
        icon: PieChart,
        path: '/recognition-analytics',
      },
      { id: 'face', label: 'Facial', icon: ScanFace, path: '/face-recognition' },
      { id: 'plates', label: 'Placas', icon: Car, path: '/license-plate' },
      { id: 'heatmap', label: 'Calor', icon: Flame, path: '/heatmap' },
      { id: 'reports', label: 'Relat.', icon: FileText, path: '/reports' },
      { id: 'evaluation', label: 'Avaliação', icon: ClipboardCheck, path: '/evaluation' },
    ],
  },
  {
    id: 'management',
    label: 'Gestão',
    icon: Users,
    defaultPath: '/zones',
    items: [
      { id: 'people', label: 'Pessoas', icon: Users, path: '/people', minRole: 'operator' },
      { id: 'zones', label: 'Zonas', icon: Target, path: '/zones' },
      {
        id: 'local-agents',
        label: 'Agentes',
        icon: Server,
        path: '/agentes-locais',
        minRole: 'manager',
      },
    ],
  },
  {
    id: 'settings',
    label: 'Config',
    icon: Settings,
    defaultPath: '/settings',
    minRole: 'manager',
    items: [
      { id: 'general', label: 'Geral', icon: Settings, path: '/settings' },
      { id: 'maintenance', label: 'Manut.', icon: Wrench, path: '/manutencao', minRole: 'admin' },
      {
        id: 'collab',
        label: 'Rede',
        icon: Network,
        path: '/rede-colaborativa',
        minRole: 'manager',
      },
      { id: 'notifications', label: 'Notif.', icon: Bell, path: '/notification-settings' },
      { id: 'streams', label: 'Streams', icon: Sliders, path: '/stream-settings' },
      { id: 'telegram', label: 'Telegram', icon: MessageSquare, path: '/telegram-settings' },
      {
        id: 'stream-alert-thresholds',
        label: 'Limites',
        icon: Sliders,
        path: '/stream-alert-thresholds',
        minRole: 'manager',
      },
      {
        id: 'operations',
        label: 'Operações',
        icon: Terminal,
        path: '/operations',
        minRole: 'admin',
      },
      {
        id: 'api-usage',
        label: 'API',
        icon: BarChart3,
        path: '/admin/api-usage',
        minRole: 'admin',
      },
      {
        id: 'csp-reports',
        label: 'CSP',
        icon: ShieldAlert,
        path: '/admin/csp-reports',
        minRole: 'admin',
      },
    ],
  },
];
