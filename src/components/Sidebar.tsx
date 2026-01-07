/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Sidebar com 5 Categorias:
 * - Monitoramento
 * - Segurança  
 * - Inteligência
 * - Gestão
 * - Configurações
 */

import { memo, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Camera,
  Bell,
  Users,
  Target,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  LogOut,
  Activity,
  Menu,
  Video,
  ScanFace,
  BarChart3,
  Flame,
  Car,
  Moon,
  Sun,
  HelpCircle,
  Shield,
  HardHat,
  Brain,
  MapPin,
  Sliders,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeProvider";

// ============================================
// TIPOS
// ============================================

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: number | string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

interface NavCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

interface SidebarProps {
  className?: string;
}

// ============================================
// CONFIGURAÇÃO - 5 CATEGORIAS
// ============================================

const sidebarCategories: NavCategory[] = [
  {
    id: "monitoring",
    label: "Monitoramento",
    icon: Camera,
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { id: "cameras", label: "Câmeras", icon: Camera, path: "/cameras" },
      { id: "recordings", label: "Gravações", icon: Video, path: "/recordings" },
    ],
  },
  {
    id: "security",
    label: "Segurança",
    icon: Shield,
    items: [
      { id: "alerts", label: "Alertas", icon: Bell, path: "/alerts", badge: 0, badgeVariant: "destructive" },
      { id: "security-rules", label: "Regras", icon: Shield, path: "/security" },
      { id: "ppe", label: "EPIs", icon: HardHat, path: "/ppe" },
    ],
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
  },
  {
    id: "management",
    label: "Gestão",
    icon: Users,
    items: [
      { id: "people", label: "Colaboradores", icon: Users, path: "/people" },
      { id: "zones", label: "Zonas", icon: Target, path: "/zones" },
    ],
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
  },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(() => {
    // Abrir categoria que contém a rota ativa
    const activeCategory = sidebarCategories.find((cat) =>
      cat.items.some((item) => location.pathname.startsWith(item.path))
    );
    return activeCategory ? [activeCategory.id] : ["monitoring"];
  });

  // Persistir estado do collapse
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  // Fechar mobile ao navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Simular contagem de alertas
  useEffect(() => {
    const interval = setInterval(() => {
      setAlertCount((prev) => Math.max(0, prev + Math.floor(Math.random() * 3) - 1));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleCollapsed = () => setCollapsed(!collapsed);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const isCategoryExpanded = (categoryId: string) =>
    expandedCategories.includes(categoryId);

  const isItemActive = (path: string) =>
    location.pathname === path ||
    (path !== "/dashboard" && location.pathname.startsWith(path));

  const isCategoryActive = (category: NavCategory) =>
    category.items.some((item) => isItemActive(item.path));

  // Badge dinâmico de alertas
  const getItemBadge = (item: NavItem) => {
    if (item.path === "/alerts") {
      return alertCount > 0 ? alertCount : undefined;
    }
    return item.badge;
  };

  // Renderizar item de navegação
  const renderNavItem = (item: NavItem, isMobile = false) => {
    const Icon = item.icon;
    const isActive = isItemActive(item.path);
    const badge = getItemBadge(item);

    const content = (
      <NavLink
        to={item.path}
        data-testid={`nav-${item.id}`}
        onClick={() => isMobile && setMobileOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm",
          "text-muted-foreground hover:text-foreground hover:bg-muted",
          isActive &&
            "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
          collapsed && !isMobile && "justify-center px-2"
        )}
      >
        <Icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-primary-foreground")} />
        {(!collapsed || isMobile) && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {badge !== undefined && Number(badge) > 0 && (
              <Badge
                variant={item.badgeVariant || "secondary"}
                className="ml-auto text-xs h-5 min-w-[20px] justify-center"
              >
                {typeof badge === "number" && badge > 99 ? "99+" : badge}
              </Badge>
            )}
          </>
        )}
      </NavLink>
    );

    if (collapsed && !isMobile) {
      return (
        <Tooltip key={item.path} delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.label}
            {badge !== undefined && Number(badge) > 0 && (
              <Badge variant={item.badgeVariant || "secondary"} className="text-xs">
                {badge}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.path}>{content}</div>;
  };

  // Renderizar categoria com collapsible
  const renderCategory = (category: NavCategory, isMobile = false) => {
    const CategoryIcon = category.icon;
    const isExpanded = isCategoryExpanded(category.id);
    const hasActiveItem = isCategoryActive(category);

    if (collapsed && !isMobile) {
      // Modo colapsado: mostrar apenas ícones dos itens
      return (
        <div key={category.id} className="space-y-1 mb-2">
          {category.items.map((item) => renderNavItem(item, isMobile))}
        </div>
      );
    }

    return (
      <Collapsible
        key={category.id}
        open={isExpanded}
        onOpenChange={() => toggleCategory(category.id)}
        className="mb-1"
      >
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
              hasActiveItem && "text-primary"
            )}
          >
            <div className="flex items-center gap-2">
              <CategoryIcon className="h-4 w-4" />
              <span>{category.label}</span>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-1 ml-4 space-y-1 border-l border-border pl-2">
          {category.items.map((item) => renderNavItem(item, isMobile))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  // Conteúdo compartilhado da sidebar
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div
      className={cn(
        "flex flex-col h-full bg-card",
        !isMobile && "border-r",
        !isMobile && (collapsed ? "w-16" : "w-64"),
        "transition-all duration-300"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center h-16 px-4 border-b",
          collapsed && !isMobile ? "justify-center" : "justify-between"
        )}
      >
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-2">
            <Eye className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">VISÃO</span>
          </div>
        )}
        {collapsed && !isMobile && <Eye className="w-6 h-6 text-primary" />}

        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", collapsed && "hidden md:flex")}
            onClick={toggleCollapsed}
            data-testid="sidebar-toggle"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* Navigation - 5 Categorias */}
      <ScrollArea className="flex-1 px-3 py-4">
        <TooltipProvider>
          <nav className="space-y-1">
            {sidebarCategories.map((category) => renderCategory(category, isMobile))}
          </nav>
        </TooltipProvider>
      </ScrollArea>

      {/* Bottom section */}
      <div className="p-3 border-t space-y-1">
        <Separator className="my-2" />

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size={collapsed && !isMobile ? "icon" : "default"}
          className={cn("w-full", (!collapsed || isMobile) && "justify-start gap-3")}
          onClick={toggleTheme}
          title={resolvedTheme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
        >
          {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {(!collapsed || isMobile) && (
            <span>{resolvedTheme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
          )}
        </Button>

        {/* Status indicator */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50",
            collapsed && !isMobile && "justify-center px-2"
          )}
        >
          <div className="relative">
            <Activity className="w-4 h-4 text-green-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          {(!collapsed || isMobile) && (
            <span className="text-xs text-muted-foreground">Sistema Online</span>
          )}
        </div>

        {/* Help */}
        {!collapsed || isMobile ? (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => {
              localStorage.removeItem("visao-onboarding-v1");
              window.location.reload();
            }}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Ver Tour</span>
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full"
                onClick={() => {
                  localStorage.removeItem("visao-onboarding-v1");
                  window.location.reload();
                }}
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Ver Tour</TooltipContent>
          </Tooltip>
        )}

        {/* User / Logout */}
        {user && (
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3",
              collapsed && !isMobile && "justify-center px-2"
            )}
            onClick={() => signOut?.()}
          >
            <LogOut className="w-4 h-4" />
            {(!collapsed || isMobile) && <span>Sair</span>}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile - Sheet Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-50 md:hidden bg-background/80 backdrop-blur-sm shadow-sm"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <SidebarContent isMobile />
        </SheetContent>
      </Sheet>

      {/* Desktop - Sidebar fixa */}
      <aside
        data-testid="sidebar"
        className={cn("hidden md:block h-screen sticky top-0", className)}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

export default memo(Sidebar);
