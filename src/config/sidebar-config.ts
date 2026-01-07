/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Sidebar Configuration - Menu organizado em 5 categorias
 * 
 * Categorias:
 * 1. Monitoramento - Visualização em tempo real
 * 2. Segurança - Alertas e controle de acesso
 * 3. Inteligência - Analytics e reconhecimento
 * 4. Gestão - Pessoas, veículos e zonas
 * 5. Configurações - Setup do sistema
 */

import { 
  Camera, 
  Video, 
  LayoutDashboard,
  Bell, 
  Shield, 
  Lock,
  Brain, 
  BarChart3, 
  Scan,
  Users, 
  Car, 
  MapPin,
  Settings, 
  Sliders, 
  MessageSquare,
  Zap,
  type LucideIcon 
} from "lucide-react";
import { ROUTES } from "@/constants/routes";

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  permission?: string;
}

export interface SidebarCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  items: SidebarItem[];
}

export const sidebarCategories: SidebarCategory[] = [
  {
    id: "monitoring",
    label: "Monitoramento",
    icon: Camera,
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        href: ROUTES.DASHBOARD,
        icon: LayoutDashboard,
      },
      {
        id: "cameras",
        label: "Câmeras",
        href: ROUTES.CAMERAS,
        icon: Camera,
      },
      {
        id: "recordings",
        label: "Gravações",
        href: ROUTES.RECORDINGS,
        icon: Video,
      },
    ],
  },
  {
    id: "security",
    label: "Segurança",
    icon: Shield,
    items: [
      {
        id: "alerts",
        label: "Alertas",
        href: ROUTES.ALERTS,
        icon: Bell,
        badge: 3, // Dynamic badge example
      },
      {
        id: "automation-rules",
        label: "Automação",
        href: ROUTES.AUTOMATION_RULES,
        icon: Zap,
      },
      {
        id: "security-rules",
        label: "Regras de Segurança",
        href: "/security",
        icon: Shield,
      },
      {
        id: "ppe",
        label: "EPIs",
        href: "/ppe",
        icon: Lock,
      },
    ],
  },
  {
    id: "intelligence",
    label: "Inteligência",
    icon: Brain,
    items: [
      {
        id: "analytics",
        label: "Analytics",
        href: ROUTES.ANALYTICS,
        icon: BarChart3,
      },
      {
        id: "face-recognition",
        label: "Reconhecimento Facial",
        href: "/face-recognition",
        icon: Scan,
      },
      {
        id: "license-plate",
        label: "Leitura de Placas",
        href: "/license-plate",
        icon: Car,
      },
      {
        id: "heatmap",
        label: "Mapa de Calor",
        href: "/heatmap",
        icon: MapPin,
      },
    ],
  },
  {
    id: "management",
    label: "Gestão",
    icon: Users,
    items: [
      {
        id: "persons",
        label: "Pessoas",
        href: ROUTES.PERSONS,
        icon: Users,
      },
      {
        id: "vehicles",
        label: "Veículos",
        href: ROUTES.VEHICLES,
        icon: Car,
      },
      {
        id: "zones",
        label: "Zonas",
        href: ROUTES.ZONES,
        icon: MapPin,
      },
    ],
  },
  {
    id: "settings",
    label: "Configurações",
    icon: Settings,
    items: [
      {
        id: "settings-general",
        label: "Geral",
        href: ROUTES.SETTINGS,
        icon: Settings,
      },
      {
        id: "notifications",
        label: "Notificações",
        href: "/notifications",
        icon: Bell,
      },
      {
        id: "streams",
        label: "Streams",
        href: "/streams",
        icon: Sliders,
      },
      {
        id: "telegram",
        label: "Telegram",
        href: "/telegram",
        icon: MessageSquare,
      },
    ],
  },
];

// Helper to get all items flattened
export const getAllSidebarItems = (): SidebarItem[] => 
  sidebarCategories.flatMap(cat => cat.items);

// Helper to find category by item href
export const getCategoryByItemHref = (href: string): SidebarCategory | undefined =>
  sidebarCategories.find(cat => cat.items.some(item => item.href === href));

// Helper to get total items count
export const getTotalItemsCount = (): number =>
  sidebarCategories.reduce((acc, cat) => acc + cat.items.length, 0);
