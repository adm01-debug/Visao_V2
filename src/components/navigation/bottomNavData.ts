import {
  Camera, Shield, Brain, Users, Settings, LayoutDashboard, Bell, Video,
  HardHat, BarChart3, ScanFace, Car, Flame, Target, Sliders, MessageSquare,
  ShieldAlert, Zap, FileText, PieChart, type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/hooks/useUserRole";

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
    id: "monitoring", label: "Monitor", icon: Camera, defaultPath: "/dashboard",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { id: "cameras", label: "Câmeras", icon: Camera, path: "/cameras" },
      { id: "recordings", label: "Gravações", icon: Video, path: "/recordings" },
    ],
  },
  {
    id: "security", label: "Segurança", icon: Shield, defaultPath: "/alerts",
    items: [
      { id: "alerts", label: "Alertas", icon: Bell, path: "/alerts" },
      { id: "panic", label: "Pânico", icon: ShieldAlert, path: "/panic-events" },
      { id: "rules", label: "Regras", icon: Shield, path: "/security", minRole: "manager" },
      { id: "automation", label: "Autom.", icon: Zap, path: "/automation-rules", minRole: "manager" },
      { id: "ppe", label: "EPIs", icon: HardHat, path: "/ppe" },
    ],
  },
  {
    id: "intelligence", label: "Intel", icon: Brain, defaultPath: "/analytics",
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart3, path: "/analytics" },
      { id: "recognition-analytics", label: "Rec. IA", icon: PieChart, path: "/recognition-analytics" },
      { id: "face", label: "Facial", icon: ScanFace, path: "/face-recognition" },
      { id: "plates", label: "Placas", icon: Car, path: "/license-plate" },
      { id: "heatmap", label: "Calor", icon: Flame, path: "/heatmap" },
      { id: "reports", label: "Relat.", icon: FileText, path: "/reports" },
    ],
  },
  {
    id: "management", label: "Gestão", icon: Users, defaultPath: "/zones",
    items: [
      { id: "people", label: "Pessoas", icon: Users, path: "/people", minRole: "operator" },
      { id: "zones", label: "Zonas", icon: Target, path: "/zones" },
    ],
  },
  {
    id: "settings", label: "Config", icon: Settings, defaultPath: "/settings", minRole: "manager",
    items: [
      { id: "general", label: "Geral", icon: Settings, path: "/settings" },
      { id: "notifications", label: "Notif.", icon: Bell, path: "/notification-settings" },
      { id: "streams", label: "Streams", icon: Sliders, path: "/stream-settings" },
      { id: "telegram", label: "Telegram", icon: MessageSquare, path: "/telegram-settings" },
    ],
  },
];
