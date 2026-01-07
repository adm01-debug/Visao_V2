/**
 * Sidebar Configuration - Navegação e categorias
 */

import {
  LayoutDashboard,
  Camera,
  Bell,
  Users,
  Target,
  Settings,
  Video,
  ScanFace,
  BarChart3,
  Flame,
  Car,
  Shield,
  HardHat,
  Brain,
  Sliders,
  MessageSquare,
  Activity,
} from "lucide-react";
import type { NavCategory } from "./types";
import type { SidebarStatus } from "@/hooks/useSidebarStatus";

export const createSidebarCategories = (status: SidebarStatus): NavCategory[] => [
  {
    id: "monitoring",
    label: "Monitoramento",
    icon: Camera,
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { 
        id: "cameras", 
        label: "Câmeras", 
        icon: Camera, 
        path: "/cameras", 
        badge: status.totalCameras > 0 ? `${status.onlineCameras}/${status.totalCameras}` : undefined 
      },
      { id: "recordings", label: "Gravações", icon: Video, path: "/recordings" },
    ],
    getStatus: () => {
      const ratio = status.totalCameras > 0 ? status.onlineCameras / status.totalCameras : 0;
      return {
        type: ratio >= 0.8 ? "success" : ratio >= 0.5 ? "warning" : status.totalCameras > 0 ? "danger" : "neutral",
        label: status.totalCameras > 0 ? `${status.onlineCameras}/${status.totalCameras}` : "Sem câmeras",
        count: status.onlineCameras,
        pulse: ratio < 0.5 && status.totalCameras > 0,
      };
    },
  },
  {
    id: "security",
    label: "Segurança",
    icon: Shield,
    items: [
      { 
        id: "alerts", 
        label: "Alertas", 
        icon: Bell, 
        path: "/alerts", 
        badge: status.unreadAlerts > 0 ? status.unreadAlerts : undefined, 
        badgeVariant: "destructive" as const 
      },
      { 
        id: "security-rules", 
        label: "Regras", 
        icon: Shield, 
        path: "/security", 
        badge: status.activeRules > 0 ? status.activeRules : undefined 
      },
      { id: "ppe", label: "EPIs", icon: HardHat, path: "/ppe" },
    ],
    getStatus: () => ({
      type: status.unreadAlerts > 5 ? "danger" : status.unreadAlerts > 0 ? "warning" : "success",
      label: status.unreadAlerts > 0 ? "Alertas" : "Seguro",
      count: status.unreadAlerts,
      pulse: status.unreadAlerts > 0,
    }),
  },
  {
    id: "intelligence",
    label: "Inteligência",
    icon: Brain,
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart3, path: "/analytics" },
      { id: "face-recognition", label: "Reconhecimento", icon: ScanFace, path: "/face-recognition" },
      { id: "recognition-logs", label: "Logs Reconhec.", icon: Activity, path: "/recognition-logs" },
      { id: "license-plate", label: "Placas", icon: Car, path: "/license-plate" },
      { id: "heatmap", label: "Mapa de Calor", icon: Flame, path: "/heatmap" },
    ],
    getStatus: () => ({
      type: status.activeRules > 0 ? "info" : "neutral",
      label: status.activeRules > 0 ? "Ativo" : "Inativo",
      count: status.activeRules,
      pulse: status.activeRules > 0,
    }),
  },
  {
    id: "management",
    label: "Gestão",
    icon: Users,
    items: [
      { 
        id: "people", 
        label: "Colaboradores", 
        icon: Users, 
        path: "/people", 
        badge: status.registeredPersons > 0 ? status.registeredPersons : undefined 
      },
      { 
        id: "zones", 
        label: "Zonas", 
        icon: Target, 
        path: "/zones", 
        badge: status.activeZones > 0 ? status.activeZones : undefined 
      },
    ],
    getStatus: () => ({
      type: status.registeredPersons > 0 || status.activeZones > 0 ? "success" : "neutral",
      label: `${status.registeredPersons}P / ${status.activeZones}Z`,
      count: status.registeredPersons + status.activeZones,
    }),
  },
  {
    id: "settings",
    label: "Configurações",
    icon: Settings,
    items: [
      { id: "settings-general", label: "Geral", icon: Settings, path: "/settings" },
      { id: "notifications", label: "Notificações", icon: Bell, path: "/notification-settings" },
      { id: "streams", label: "Streams", icon: Sliders, path: "/stream-settings" },
      { id: "telegram", label: "Telegram", icon: MessageSquare, path: "/telegram-settings" },
    ],
    getStatus: () => ({
      type: "success",
      label: "OK",
    }),
  },
];
