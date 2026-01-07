/**
 * Sidebar Types - Tipos compartilhados para componentes da Sidebar
 */

import type { LucideIcon } from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: number | string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
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
}

export interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  expandedCategories: string[];
  toggleCategory: (categoryId: string) => void;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}
