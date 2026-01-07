/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Sidebar com 5 Categorias Animadas + Quick Search (Cmd+K):
 * - Monitoramento (status: câmeras online) [DADOS REAIS]
 * - Segurança (status: alertas ativos) [DADOS REAIS]
 * - Inteligência (status: análises) [DADOS REAIS]
 * - Gestão (status: pessoas/zonas) [DADOS REAIS]
 * - Configurações (status: sistema)
 */

import { memo, useState, useEffect, useCallback, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
  Search,
  Command,
  type LucideIcon,
  AlertTriangle,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeProvider";
import { useSidebarStatus, type SidebarStatus } from "@/hooks/useSidebarStatus";

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

const createSidebarCategories = (status: SidebarStatus): NavCategory[] => [
  {
    id: "monitoring",
    label: "Monitoramento",
    icon: Camera,
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { id: "cameras", label: "Câmeras", icon: Camera, path: "/cameras", badge: status.totalCameras > 0 ? `${status.onlineCameras}/${status.totalCameras}` : undefined },
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
      { id: "alerts", label: "Alertas", icon: Bell, path: "/alerts", badge: status.unreadAlerts > 0 ? status.unreadAlerts : undefined, badgeVariant: "destructive" as const },
      { id: "security-rules", label: "Regras", icon: Shield, path: "/security", badge: status.activeRules > 0 ? status.activeRules : undefined },
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
      { id: "people", label: "Colaboradores", icon: Users, path: "/people", badge: status.registeredPersons > 0 ? status.registeredPersons : undefined },
      { id: "zones", label: "Zonas", icon: Target, path: "/zones", badge: status.activeZones > 0 ? status.activeZones : undefined },
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

// ============================================
// COMPONENTE: Quick Search Dialog (Cmd+K)
// ============================================

interface QuickSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: NavCategory[];
  onNavigate: (path: string) => void;
}

const QuickSearchDialog = memo(({ open, onOpenChange, categories, onNavigate }: QuickSearchDialogProps) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const location = useLocation();

  // Flatten all items
  const allItems = useMemo(() => {
    return categories.flatMap(cat => 
      cat.items.map(item => ({ ...item, category: cat.label }))
    );
  }, [categories]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const lowerQuery = query.toLowerCase();
    return allItems.filter(item =>
      item.label.toLowerCase().includes(lowerQuery) ||
      item.category.toLowerCase().includes(lowerQuery) ||
      item.path.toLowerCase().includes(lowerQuery)
    );
  }, [query, allItems]);

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    filteredItems.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            onNavigate(filteredItems[selectedIndex].path);
            onOpenChange(false);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filteredItems, selectedIndex, onNavigate, onOpenChange]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Reset selected index when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  let currentIndex = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Busca Rápida</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar seções..."
            className="border-0 p-0 h-auto focus-visible:ring-0 text-base placeholder:text-muted-foreground/60"
          />
          <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-80">
          <div className="p-2">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="mb-3 last:mb-0">
                <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {category}
                </p>
                {items.map((item) => {
                  currentIndex++;
                  const thisIndex = currentIndex;
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const isSelected = thisIndex === selectedIndex;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.path);
                        onOpenChange(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(thisIndex)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                        "hover:bg-accent/80 focus:bg-accent focus:outline-none",
                        isSelected && "bg-accent",
                        isActive && "text-primary"
                      )}
                    >
                      <Icon className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "flex-1 text-sm",
                        isActive && "font-medium"
                      )}>
                        {item.label}
                      </span>
                      {item.badge !== undefined && Number(item.badge) > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-destructive/20 text-destructive">
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                        <span className="text-xs text-muted-foreground">Atual</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="py-8 text-center">
                <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma seção encontrada para "{query}"
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px]">↓</kbd>
              <span>navegar</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px]">↵</kbd>
              <span>selecionar</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px]">ESC</kbd>
            <span>fechar</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
});
QuickSearchDialog.displayName = "QuickSearchDialog";

// ============================================
// COMPONENTE: Search Trigger Button
// ============================================

interface SearchTriggerProps {
  collapsed: boolean;
  onClick: () => void;
}

const SearchTrigger = memo(({ collapsed, onClick }: SearchTriggerProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            onClick={onClick}
            className={cn(
              "w-full justify-start gap-2 text-muted-foreground hover:text-foreground",
              "border-dashed hover:border-solid hover:bg-accent/50",
              collapsed && "justify-center px-2"
            )}
          >
            <Search className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left text-sm">Buscar...</span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  <Command className="h-3 w-3" />K
                </kbd>
              </>
            )}
          </Button>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right">
            <p>Buscar (⌘K)</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
});
SearchTrigger.displayName = "SearchTrigger";

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  
  // Hook para dados reais do banco de dados
  const sidebarStatus = useSidebarStatus();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Gerar categorias com dados reais do banco
  const sidebarCategories = useMemo(
    () => createSidebarCategories(sidebarStatus),
    [sidebarStatus]
  );

  const [expandedCategories, setExpandedCategories] = useState<string[]>(() => {
    // Abrir categoria que contém a rota ativa
    const defaultStatus: SidebarStatus = {
      unreadAlerts: 0,
      onlineCameras: 0,
      totalCameras: 0,
      activeRules: 0,
      totalRules: 0,
      registeredPersons: 0,
      activeZones: 0,
      isLoading: true,
    };
    const categories = createSidebarCategories(defaultStatus);
    const activeCategory = categories.find((cat) =>
      cat.items.some((item) => location.pathname.startsWith(item.path))
    );
    return activeCategory ? [activeCategory.id] : ["monitoring"];
  });

  // Global Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Persistir estado do collapse
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const toggleCollapsed = () => setCollapsed(!collapsed);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    setMobileOpen(false);
  }, [navigate]);

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

      {/* Search Trigger */}
      <div className={cn("px-3 py-2", collapsed && !isMobile && "px-2")}>
        <SearchTrigger collapsed={collapsed && !isMobile} onClick={() => setSearchOpen(true)} />
      </div>

      {/* Navigation - 5 Categorias */}
      <ScrollArea className="flex-1 px-3 py-2">
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
      {/* Quick Search Dialog */}
      <QuickSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        categories={sidebarCategories}
        onNavigate={handleNavigate}
      />

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
