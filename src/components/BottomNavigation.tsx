/**
 * Bottom Navigation Mobile - 5 Categorias Principais
 * Otimizada para operadores em campo com indicadores em tempo real
 */

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStatus } from "@/hooks/useSidebarStatus";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

interface NavCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  defaultPath: string;
  items: NavItem[];
}

const categories: NavCategory[] = [
  {
    id: "monitoring",
    label: "Monitor",
    icon: Camera,
    defaultPath: "/dashboard",
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
    defaultPath: "/alerts",
    items: [
      { id: "alerts", label: "Alertas", icon: Bell, path: "/alerts" },
      { id: "rules", label: "Regras", icon: Shield, path: "/security" },
      { id: "ppe", label: "EPIs", icon: HardHat, path: "/ppe" },
    ],
  },
  {
    id: "intelligence",
    label: "Intel",
    icon: Brain,
    defaultPath: "/analytics",
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart3, path: "/analytics" },
      { id: "face", label: "Facial", icon: ScanFace, path: "/face-recognition" },
      { id: "plates", label: "Placas", icon: Car, path: "/license-plate" },
      { id: "heatmap", label: "Calor", icon: Flame, path: "/heatmap" },
    ],
  },
  {
    id: "management",
    label: "Gestão",
    icon: Users,
    defaultPath: "/people",
    items: [
      { id: "people", label: "Pessoas", icon: Users, path: "/people" },
      { id: "zones", label: "Zonas", icon: Target, path: "/zones" },
    ],
  },
  {
    id: "settings",
    label: "Config",
    icon: Settings,
    defaultPath: "/settings",
    items: [
      { id: "general", label: "Geral", icon: Settings, path: "/settings" },
      { id: "notifications", label: "Notif.", icon: Bell, path: "/notification-settings" },
      { id: "streams", label: "Streams", icon: Sliders, path: "/stream-settings" },
      { id: "telegram", label: "Telegram", icon: MessageSquare, path: "/telegram-settings" },
    ],
  },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const status = useSidebarStatus();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const getActiveCategory = () => {
    for (const cat of categories) {
      if (cat.items.some((item) => location.pathname === item.path)) {
        return cat.id;
      }
    }
    return "monitoring";
  };

  const activeCategory = getActiveCategory();

  const getCategoryBadge = (categoryId: string): number | null => {
    switch (categoryId) {
      case "security":
        return status.unreadAlerts > 0 ? status.unreadAlerts : null;
      case "monitoring":
        return status.totalCameras > 0 ? status.onlineCameras : null;
      case "management":
        return status.registeredPersons > 0 ? status.registeredPersons : null;
      default:
        return null;
    }
  };

  const getCategoryStatus = (categoryId: string): "success" | "warning" | "danger" | null => {
    switch (categoryId) {
      case "security":
        if (status.unreadAlerts > 5) return "danger";
        if (status.unreadAlerts > 0) return "warning";
        return "success";
      case "monitoring":
        const ratio = status.totalCameras > 0 ? status.onlineCameras / status.totalCameras : 0;
        if (ratio >= 0.8) return "success";
        if (ratio >= 0.5) return "warning";
        return status.totalCameras > 0 ? "danger" : null;
      default:
        return null;
    }
  };

  const handleCategoryClick = (category: NavCategory) => {
    if (expandedCategory === category.id) {
      // Already expanded, close it
      setExpandedCategory(null);
    } else if (activeCategory === category.id) {
      // Active category, expand submenu
      setExpandedCategory(category.id);
    } else {
      // Navigate to default path
      navigate(category.defaultPath);
      setExpandedCategory(null);
    }
  };

  const handleItemClick = (path: string) => {
    navigate(path);
    setExpandedCategory(null);
  };

  return (
    <>
      {/* Expanded submenu overlay */}
      <AnimatePresence>
        {expandedCategory && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setExpandedCategory(null)}
            />

            {/* Submenu */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-16 left-0 right-0 bg-card border-t rounded-t-2xl shadow-2xl z-50 md:hidden"
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">
                    {categories.find((c) => c.id === expandedCategory)?.label}
                  </h3>
                  <button
                    onClick={() => setExpandedCategory(null)}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Items grid */}
                <div className="grid grid-cols-3 gap-3">
                  {categories
                    .find((c) => c.id === expandedCategory)
                    ?.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;

                      return (
                        <motion.button
                          key={item.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleItemClick(item.path)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-xl transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/50 hover:bg-muted"
                          )}
                        >
                          <Icon className="h-6 w-6" />
                          <span className="text-xs font-medium text-center">
                            {item.label}
                          </span>
                        </motion.button>
                      );
                    })}
                </div>
              </div>

              {/* Handle indicator */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-muted-foreground/30" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50 md:hidden safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            const isExpanded = expandedCategory === category.id;
            const badge = getCategoryBadge(category.id);
            const statusColor = getCategoryStatus(category.id);

            return (
              <motion.button
                key={category.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleCategoryClick(category)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors min-w-[60px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {/* Icon container with badge */}
                <div className="relative">
                  <motion.div
                    animate={{
                      scale: isActive ? 1.1 : 1,
                      y: isActive ? -2 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />
                  </motion.div>

                  {/* Badge */}
                  {badge !== null && badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        "absolute -top-1 -right-2 min-w-[18px] h-[18px] flex items-center justify-center",
                        "text-[10px] font-bold rounded-full text-white",
                        statusColor === "danger" && "bg-red-500",
                        statusColor === "warning" && "bg-amber-500",
                        statusColor === "success" && "bg-emerald-500",
                        !statusColor && "bg-primary"
                      )}
                    >
                      {badge > 99 ? "99+" : badge}
                    </motion.span>
                  )}

                  {/* Status dot */}
                  {statusColor && !badge && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
                        statusColor === "danger" && "bg-red-500",
                        statusColor === "warning" && "bg-amber-500",
                        statusColor === "success" && "bg-emerald-500"
                      )}
                    />
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "text-[10px] font-medium truncate max-w-full",
                    isActive && "font-semibold"
                  )}
                >
                  {category.label}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-0.5 w-8 h-1 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Expand indicator */}
                <AnimatePresence>
                  {isActive && !isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute -top-1"
                    >
                      <ChevronUp className="h-3 w-3 text-muted-foreground" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </nav>

      {/* Spacer to prevent content from being hidden behind bottom nav */}
      <div className="h-16 md:hidden" />
    </>
  );
}

export default BottomNavigation;
