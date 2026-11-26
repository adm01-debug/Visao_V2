/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Sidebar Categories Configuration with Dynamic Status
 */

import { STALE_ACTIONABLE_HOURS as COLLAB_STALE_ACTIONABLE_HOURS } from '@/lib/collab/collabNavBadge';

import {
  LayoutDashboard,
  KeyRound,
  Camera,
  Bell,
  Users,
  Target,
  Settings,
  Video,
  ScanFace,
  ScanSearch,
  BarChart3,
  Flame,
  Car,
  Shield,
  HardHat,
  Brain,
  Sliders,
  MessageSquare,
  Activity,
  ShieldAlert,
  Zap,
  FileText,
  PieChart,
  TrendingUp,
  ClipboardList,
  Route,
  UserCog,
  TestTube2,
  Wrench,
  Network,
  FileCheck2,
  FileSearch,
  Map as MapIcon,
  Star,
  BellRing,
  CalendarClock,
  ClipboardCheck,
  Clock,
  Gauge,
  ScanLine,
  Server,
  Terminal,
  Timer,
} from 'lucide-react';
import type { NavCategory } from '../types';
import type { SidebarStatus } from '@/hooks/useSidebarStatus';

export const createSidebarCategories = (status: SidebarStatus): NavCategory[] => [
  {
    id: 'monitoring',
    label: 'Monitoramento',
    icon: Camera,
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      {
        id: 'cameras',
        label: 'Câmeras',
        icon: Camera,
        path: '/cameras',
        badge:
          status.totalCameras > 0 ? `${status.onlineCameras}/${status.totalCameras}` : undefined,
      },
      { id: 'fleet-health', label: 'Saúde da Frota', icon: Activity, path: '/cameras/frota' },
      { id: 'favorite-views', label: 'Visualizações', icon: Star, path: '/visualizacoes' },
      { id: 'nvrs', label: 'NVRs', icon: Video, path: '/nvrs' },
      {
        id: 'device-registrations',
        label: 'Conexão por Registro',
        icon: KeyRound,
        path: '/dispositivos',
      },
      { id: 'recordings', label: 'Gravações', icon: Video, path: '/recordings' },
      // Rotas implementadas e sem consumidor: só alcançáveis digitando a URL.
      { id: 'stream-health', label: 'Saúde dos Streams', icon: Activity, path: '/stream-health' },
      {
        id: 'bandwidth-monitor',
        label: 'Consumo de Banda',
        icon: Gauge,
        path: '/bandwidth-monitor',
      },
      {
        id: 'motion-masks',
        label: 'Máscaras de Movimento',
        icon: ScanLine,
        path: '/motion-masks',
      },
      { id: 'timelapse', label: 'Timelapse', icon: Timer, path: '/timelapse' },
      { id: 'schedules', label: 'Agendamentos', icon: CalendarClock, path: '/schedules' },
    ],
    getStatus: () => {
      const ratio = status.totalCameras > 0 ? status.onlineCameras / status.totalCameras : 0;
      return {
        type:
          ratio >= 0.8
            ? 'success'
            : ratio >= 0.5
              ? 'warning'
              : status.totalCameras > 0
                ? 'danger'
                : 'neutral',
        label:
          status.totalCameras > 0
            ? `${status.onlineCameras}/${status.totalCameras}`
            : 'Sem câmeras',
        count: status.onlineCameras,
        pulse: ratio < 0.5 && status.totalCameras > 0,
      };
    },
  },
  {
    id: 'security',
    label: 'Segurança',
    icon: Shield,
    items: [
      {
        id: 'alerts',
        label: 'Alertas',
        icon: Bell,
        path: '/alerts',
        badge: status.unreadAlerts > 0 ? status.unreadAlerts : undefined,
        badgeVariant: 'destructive' as const,
      },
      {
        id: 'panic-events',
        label: 'Pânico',
        icon: ShieldAlert,
        path: '/panic-events',
      },
      {
        id: 'incident-notifications',
        label: 'Notificações',
        icon: Bell,
        path: '/notificacoes',
      },
      {
        id: 'night-events',
        label: 'Alertas Noturnos',
        icon: ShieldAlert,
        path: '/eventos/noturnos',
      },
      {
        id: 'out-of-area',
        label: 'Fora da Área',
        icon: Target,
        path: '/eventos/fora-de-area',
      },
      {
        id: 'security-rules',
        label: 'Regras',
        icon: Shield,
        path: '/security',
        badge: status.activeRules > 0 ? status.activeRules : undefined,
        minRole: 'manager',
      },
      {
        id: 'automation-rules',
        label: 'Automação',
        icon: Zap,
        path: '/automation-rules',
        minRole: 'manager',
      },
      { id: 'ppe', label: 'EPIs', icon: HardHat, path: '/ppe' },
      {
        id: 'event-alerts',
        label: 'Alertas de Evento',
        icon: BellRing,
        path: '/event-alerts',
      },
      {
        id: 'alerts-timeline',
        label: 'Timeline de Alertas',
        icon: Clock,
        path: '/alerts-timeline',
      },
    ],
    getStatus: () => ({
      type: status.unreadAlerts > 5 ? 'danger' : status.unreadAlerts > 0 ? 'warning' : 'success',
      label: status.unreadAlerts > 0 ? 'Alertas' : 'Seguro',
      count: status.unreadAlerts,
      pulse: status.unreadAlerts > 0,
    }),
  },
  {
    id: 'intelligence',
    label: 'Inteligência',
    icon: Brain,
    items: [
      { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
      {
        id: 'recognition-analytics',
        label: 'Reconhec. Analytics',
        icon: PieChart,
        path: '/recognition-analytics',
      },
      {
        id: 'behavior-detection',
        label: 'Comportamento',
        icon: Brain,
        path: '/behavior-detection',
      },
      {
        id: 'face-recognition',
        label: 'Reconhecimento',
        icon: ScanFace,
        path: '/face-recognition',
      },
      // Onda 197: o histórico facial era escrito por máquina e nunca lido por gente.
      {
        id: 'face-search',
        label: 'Busca de Faces',
        icon: ScanSearch,
        path: '/busca-de-faces',
        minRole: 'operator' as const,
      },
      {
        id: 'recognition-logs',
        label: 'Logs Reconhec.',
        icon: Activity,
        path: '/recognition-logs',
      },
      { id: 'license-plate', label: 'Placas', icon: Car, path: '/license-plate' },
      { id: 'vehicles', label: 'Veículos', icon: Car, path: '/vehicles' },
      { id: 'heatmap', label: 'Mapa de Calor', icon: Flame, path: '/heatmap' },
      { id: 'reports', label: 'Relatórios', icon: FileText, path: '/reports' },
      {
        id: 'weekly-report',
        label: 'Relatório Semanal',
        icon: FileText,
        path: '/relatorio-semanal',
      },
      {
        id: 'evaluation',
        label: 'Avaliação de Detecções',
        icon: ClipboardCheck,
        path: '/evaluation',
      },
    ],
    getStatus: () => ({
      type: status.activeRules > 0 ? 'info' : 'neutral',
      label: status.activeRules > 0 ? 'Ativo' : 'Inativo',
      count: status.activeRules,
      pulse: status.activeRules > 0,
    }),
  },
  {
    id: 'management',
    label: 'Gestão',
    icon: Users,
    items: [
      {
        id: 'people',
        label: 'Colaboradores',
        icon: Users,
        path: '/people',
        badge: status.registeredPersons > 0 ? status.registeredPersons : undefined,
        minRole: 'operator',
      },
      {
        id: 'persons',
        label: 'Pessoas',
        icon: Users,
        path: '/persons',
        minRole: 'operator',
      },
      {
        id: 'zones',
        label: 'Zonas',
        icon: Target,
        path: '/zones',
        badge: status.activeZones > 0 ? status.activeZones : undefined,
      },
      {
        id: 'productivity',
        label: 'Produtividade',
        icon: TrendingUp,
        path: '/productivity',
      },
      {
        id: 'journey-reports',
        label: 'Jornada',
        icon: ClipboardList,
        path: '/journey-reports',
      },
      {
        id: 'collaborator-flow',
        label: 'Fluxo',
        icon: Route,
        path: '/collaborator-flow',
      },
      {
        id: 'goals-alerts',
        label: 'Metas & KPIs',
        icon: Target,
        path: '/goals-alerts',
      },
      {
        id: 'collab-network',
        label: 'Rede Colaborativa',
        icon: Network,
        path: '/rede-colaborativa',
        minRole: 'manager',
        // Onda 139: convite recebido tem prazo — o contador é o que impede que
        // ele vença por falta de alguém abrir a página.
        badge: status.collabUnread > 0 ? status.collabUnread : undefined,
        badgeVariant: status.collabCritical > 0 ? ('destructive' as const) : ('warning' as const),
        badgePulse:
          status.collabActionable > 0 &&
          (status.collabOldestAgeHours ?? 0) >= COLLAB_STALE_ACTIONABLE_HOURS,
      },

      {
        // Onda 159: a Onda 158 selava a prova no servidor, mas ninguém
        // conseguia conferir o selo depois — existia e era invisível.
        // Onda 161: mapa de situação — a frota tinha estado, mas ninguém via
        // ONDE cada câmera está quando o alarme dispara.
        id: 'site-plan',
        label: 'Planta Baixa',
        icon: MapIcon,
        path: '/planta-baixa',
        minRole: 'operator',
      },
      {
        id: 'evidence-exports',
        label: 'Registro Probatório',
        icon: FileCheck2,
        path: '/registro-probatorio',
        minRole: 'manager',
      },
      {
        id: 'attestation-conference',
        label: 'Conferência de Atestado',
        icon: FileSearch,
        path: '/conferencia-atestado',
        minRole: 'manager',
      },
      {
        id: 'users',
        label: 'Usuários',
        icon: UserCog,
        path: '/users',
        minRole: 'admin',
      },
      {
        id: 'coverage',
        label: 'Cobertura',
        icon: TestTube2,
        path: '/coverage',
        minRole: 'admin',
      },
      {
        id: 'local-agents',
        label: 'Agentes Locais',
        icon: Server,
        path: '/agentes-locais',
        minRole: 'manager',
      },
    ],
    getStatus: () => ({
      type: status.registeredPersons > 0 || status.activeZones > 0 ? 'success' : 'neutral',
      label: `${status.registeredPersons}P / ${status.activeZones}Z`,
      count: status.registeredPersons + status.activeZones,
    }),
  },
  {
    id: 'settings',
    label: 'Configurações',
    icon: Settings,
    minRole: 'manager',
    items: [
      { id: 'settings-general', label: 'Geral', icon: Settings, path: '/settings' },
      { id: 'notifications', label: 'Notificações', icon: Bell, path: '/notification-settings' },
      // Onda 216: cadastro dos esquemas de alarme (régua da Onda 215 sobre a base da 217).
      { id: 'alarm-schemes', label: 'Esquemas de alarme', icon: Bell, path: '/esquemas-de-alarme' },
      { id: 'streams', label: 'Streams', icon: Sliders, path: '/stream-settings' },
      { id: 'telegram', label: 'Telegram', icon: MessageSquare, path: '/telegram-settings' },
      {
        // Onda 137: o console da Onda 136 só era alcançável digitando a URL.
        id: 'maintenance-console',
        label: 'Manutenção',
        icon: Wrench,
        path: '/manutencao',
        minRole: 'admin',
        badge: status.openMaintenanceAlerts > 0 ? status.openMaintenanceAlerts : undefined,
        badgeVariant:
          status.openMaintenanceCritical > 0 ? ('destructive' as const) : ('warning' as const),
        badgePulse: status.maintenanceAtCeiling > 0,
        badgeSrLabel:
          status.openMaintenanceAlerts > 0
            ? `${status.openMaintenanceAlerts} incidente(s) de manutenção sem reconhecimento`
            : undefined,
      },
      {
        id: 'stream-alert-thresholds',
        label: 'Limites de Alerta',
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
        label: 'Uso da API',
        icon: BarChart3,
        path: '/admin/api-usage',
        minRole: 'admin',
      },
      {
        id: 'csp-reports',
        label: 'Relatórios CSP',
        icon: Shield,
        path: '/admin/csp-reports',
        minRole: 'admin',
      },
    ],
    getStatus: () =>
      status.openMaintenanceAlerts > 0
        ? {
            type: status.openMaintenanceCritical > 0 ? ('danger' as const) : ('warning' as const),
            label: 'Manutenção',
            count: status.openMaintenanceAlerts,
            pulse: status.maintenanceAtCeiling > 0,
          }
        : {
            type: 'success' as const,
            label: 'OK',
          },
  },
];
