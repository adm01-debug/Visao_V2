/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Sidebar com 5 Categorias Animadas:
 * - Monitoramento (status: câmeras online)
 * - Segurança (status: alertas ativos)
 * - Inteligência (status: análises)
 * - Gestão (status: pessoas/zonas)
 * - Configurações (status: sistema)
 */

import { memo, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  Sliders,
  MessageSquare,
  type LucideIcon,
  AlertTriangle,
  CheckCircle2,
  Zap,
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

interface CategoryStatus {
  type: "success" | "warning" | "danger" | "info" | "neutral";
  label: string;
  count?: number;
  pulse?: boolean;
}

interface NavCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  getStatus?: () => CategoryStatus;
}

interface SidebarProps {
  className?: string;
}

// ============================================
// COMPONENTE: Ícone Animado da Categoria
// ============================================

const AnimatedCategoryIcon = memo(({ 
  icon: Icon, 
  status, 
  isExpanded,
  isActive 
}: { 
  icon: LucideIcon; 
  status: CategoryStatus;
  isExpanded: boolean;
  isActive: boolean;
}) => {
  const statusColors = {
    success: "text-green-500",
    warning: "text-amber-500",
    danger: "text-red-500",
    info: "text-blue-500",
    neutral: "text-muted-foreground",
  };

  const pulseColors = {
    success: "bg-green-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    info: "bg-blue-500",
    neutral: "bg-muted-foreground",
  };

  return (
    <div className="relative">
      <motion.div
        animate={{
          scale: isExpanded ? 1.1 : 1,
          rotate: isExpanded ? 5 : 0,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Icon className={cn(
          "h-4 w-4 transition-colors duration-200",
          isActive ? "text-primary" : statusColors[status.type]
        )} />
      </motion.div>
      
      {/* Status Pulse Indicator */}
      {status.pulse && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full",
            pulseColors[status.type]
          )}
        >
          <span className={cn(
            "absolute inset-0 rounded-full animate-ping opacity-75",
            pulseColors[status.type]
          )} />
        </motion.span>
      )}
    </div>
  );
});
AnimatedCategoryIcon.displayName = "AnimatedCategoryIcon";

// ============================================
// COMPONENTE: Indicador de Status da Categoria
// ============================================

const CategoryStatusIndicator = memo(({ status, collapsed }: { status: CategoryStatus; collapsed: boolean }) => {
  const statusConfig = {
    success: { bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/30" },
    warning: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/30" },
    danger: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30" },
    info: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30" },
    neutral: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" },
  };

  const config = statusConfig[status.type];

  if (collapsed) {
    return status.count !== undefined && status.count > 0 ? (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={cn(
          "absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center",
          "text-[10px] font-bold rounded-full",
          config.bg, config.text
        )}
      >
        {status.count > 99 ? "99+" : status.count}
      </motion.span>
    ) : null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium",
        "border",
        config.bg, config.text, config.border
      )}
    >
      {status.count !== undefined && (
        <span className="font-bold">{status.count}</span>
      )}
      <span className="truncate max-w-[60px]">{status.label}</span>
    </motion.div>
  );
});
CategoryStatusIndicator.displayName = "CategoryStatusIndicator";

// ============================================
// CONFIGURAÇÃO - 5 CATEGORIAS COM STATUS
// ============================================

const createSidebarCategories = (alertCount: number, camerasOnline: number): NavCategory[] => [
  {
    id: "monitoring",
    label: "Monitoramento",
    icon: Camera,
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { id: "cameras", label: "Câmeras", icon: Camera, path: "/cameras" },
      { id: "recordings", label: "Gravações", icon: Video, path: "/recordings" },
    ],
    getStatus: () => ({
      type: camerasOnline > 0 ? "success" : "neutral",
      label: camerasOnline > 0 ? "Online" : "Offline",
      count: camerasOnline,
      pulse: camerasOnline > 0,
    }),
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
    getStatus: () => ({
      type: alertCount > 5 ? "danger" : alertCount > 0 ? "warning" : "success",
      label: alertCount > 0 ? "Alertas" : "Seguro",
      count: alertCount,
      pulse: alertCount > 0,
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
      type: "info",
      label: "Ativo",
      pulse: true,
    }),
  },
  {
    id: "management",
    label: "Gestão",
    icon: Users,
    items: [
      { id: "people", label: "Colaboradores", icon: Users, path: "/people" },
      { id: "zones", label: "Zonas", icon: Target, path: "/zones" },
    ],
    getStatus: () => ({
      type: "neutral",
      label: "Gestão",
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
  const [alertCount, setAlertCount] = useState(3);
  const [camerasOnline, setCamerasOnline] = useState(8);
  
  // Gerar categorias com status dinâmico
  const sidebarCategories = createSidebarCategories(alertCount, camerasOnline);

  const [expandedCategories, setExpandedCategories] = useState<string[]>(() => {
    // Abrir categoria que contém a rota ativa
    const categories = createSidebarCategories(0, 0);
    const activeCategory = categories.find((cat) =>
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

  // Simular contagem de alertas e câmeras online
  useEffect(() => {
    const interval = setInterval(() => {
      setAlertCount((prev) => Math.max(0, Math.min(12, prev + Math.floor(Math.random() * 5) - 2)));
      setCamerasOnline((prev) => Math.max(3, Math.min(12, prev + Math.floor(Math.random() * 3) - 1)));
    }, 8000);
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

  // Renderizar categoria com collapsible e animações
  const renderCategory = (category: NavCategory, isMobile = false) => {
    const CategoryIcon = category.icon;
    const isExpanded = isCategoryExpanded(category.id);
    const hasActiveItem = isCategoryActive(category);
    const status = category.getStatus?.() || { type: "neutral" as const, label: "" };

    if (collapsed && !isMobile) {
      // Modo colapsado: mostrar apenas ícones dos itens com indicador
      return (
        <div key={category.id} className="space-y-1 mb-3 relative">
          {/* Category indicator in collapsed mode */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="flex justify-center py-1 relative">
                <AnimatedCategoryIcon 
                  icon={CategoryIcon} 
                  status={status} 
                  isExpanded={false}
                  isActive={hasActiveItem}
                />
                {status.count !== undefined && status.count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      "absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center",
                      "text-[9px] font-bold rounded-full",
                      status.type === "danger" ? "bg-red-500 text-white" :
                      status.type === "warning" ? "bg-amber-500 text-white" :
                      status.type === "success" ? "bg-green-500 text-white" :
                      "bg-blue-500 text-white"
                    )}
                  >
                    {status.count > 99 ? "+" : status.count}
                  </motion.span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="flex items-center gap-2">
              <span className="font-medium">{category.label}</span>
              {status.label && (
                <Badge variant="outline" className={cn(
                  "text-[10px] h-5",
                  status.type === "success" && "border-green-500/50 text-green-500",
                  status.type === "warning" && "border-amber-500/50 text-amber-500",
                  status.type === "danger" && "border-red-500/50 text-red-500",
                  status.type === "info" && "border-blue-500/50 text-blue-500"
                )}>
                  {status.count !== undefined && `${status.count} `}{status.label}
                </Badge>
              )}
            </TooltipContent>
          </Tooltip>
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
          <motion.button
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              hasActiveItem && "bg-muted/50 text-primary",
              isExpanded && "bg-muted/30"
            )}
          >
            <div className="flex items-center gap-2.5">
              <AnimatedCategoryIcon 
                icon={CategoryIcon} 
                status={status} 
                isExpanded={isExpanded}
                isActive={hasActiveItem}
              />
              <span>{category.label}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Status Indicator */}
              <AnimatePresence mode="wait">
                {!isExpanded && status.label && (
                  <CategoryStatusIndicator status={status} collapsed={false} />
                )}
              </AnimatePresence>
              
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            </div>
          </motion.button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-1 ml-4 space-y-0.5 border-l-2 border-border/50 pl-3"
          >
            {category.items.map((item, index) => (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {renderNavItem(item, isMobile)}
              </motion.div>
            ))}
          </motion.div>
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
