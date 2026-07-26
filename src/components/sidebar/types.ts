/**
 * Sidebar Types - Tipos compartilhados para componentes da Sidebar
 */

import type { LucideIcon } from "lucide-react";
import type { AppRole } from "@/hooks/useUserRole";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: number | string;
  /**
   * Onda 137: as variantes precisam ser as que `getBadgeClasses` realmente
   * entende. O contrato anterior ("secondary"/"outline") não existia no
   * renderizador e caía silenciosamente no estilo padrão.
   */
  badgeVariant?: "default" | "destructive" | "warning" | "success";
  /** Onda 137: destaca o contador quando não haverá mais aviso automático. */
  badgePulse?: boolean;
  /** Texto acessível do contador; cai no label quando ausente. */
  badgeSrLabel?: string;
  /** Role mínima para ver este item */
  minRole?: AppRole;
}

export interface CategoryStatus {
  type: "success" | "warning" | "danger" | "info" | "neutral";
  label: string;
  count?: number;
  pulse?: boolean;
}

export interface NavCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  getStatus?: () => CategoryStatus;
  /** Role mínima para ver esta categoria inteira */
  minRole?: AppRole;
}

export interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  expandedCategories: string[];
  toggleCategory: (categoryId: string) => void;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}
