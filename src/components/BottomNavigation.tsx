/**
 * Bottom Navigation Mobile - Premium Design
 */
import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStatus } from "@/hooks/useSidebarStatus";
import { useUserRole } from "@/hooks/useUserRole";
import { allCategories, type NavCategory } from "./navigation/bottomNavData";
import { triggerHaptic } from "@/lib/haptics";
import { buildBottomNavBadge } from "@/lib/navigation/bottomNavBadge";

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const status = useSidebarStatus();
  const { hasMinRole } = useUserRole();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const categories = useMemo(() =>
    allCategories
      .filter(c => !c.minRole || hasMinRole(c.minRole))
      .map(c => ({ ...c, items: c.items.filter(i => !i.minRole || hasMinRole(i.minRole)) }))
      .filter(c => c.items.length > 0),
    [hasMinRole]
  );

  const activeCategory = useMemo(() => {
    for (const cat of categories) {
      if (cat.items.some(i => location.pathname === i.path)) return cat.id;
    }
    return "monitoring";
  }, [categories, location.pathname]);

  // Onda 138 — a decisão de contagem vive em `bottomNavBadge`; aqui só se pinta.
  const isAdmin = hasMinRole("admin");
  const badges = useMemo(() => {
    const map: Record<string, ReturnType<typeof buildBottomNavBadge>> = {};
    for (const cat of allCategories) {
      map[cat.id] = buildBottomNavBadge(cat.id, status, isAdmin);
    }
    return map;
  }, [status, isAdmin]);


  const handleCategoryClick = (cat: NavCategory) => {
    triggerHaptic('light');
    if (expandedCategory === cat.id) setExpandedCategory(null);
    else if (activeCategory === cat.id) setExpandedCategory(cat.id);
    else { navigate(cat.defaultPath); setExpandedCategory(null); }
  };

  return (
    <>
      <AnimatePresence>
        {expandedCategory && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setExpandedCategory(null)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-16 left-0 right-0 bg-card border-t border-border/50 rounded-t-2xl z-50 md:hidden"
              style={{ boxShadow: '0 -8px 30px hsl(var(--background) / 0.5)' }}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-base text-foreground">{categories.find(c => c.id === expandedCategory)?.label}</h3>
                  <button onClick={() => setExpandedCategory(null)} className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {categories.find(c => c.id === expandedCategory)?.items.map(item => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <motion.button key={item.id} whileTap={{ scale: 0.95 }}
                        onClick={() => { 
                          triggerHaptic('medium');
                          navigate(item.path); 
                          setExpandedCategory(null); 
                        }}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3.5 rounded-xl transition-all",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/30 hover:bg-muted/60 text-foreground"
                        )}>
                        <Icon className="h-5 w-5" /><span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-muted-foreground/20" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav aria-label="Navegação principal mobile" role="navigation"
        className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/30 z-50 md:hidden safe-area-inset-bottom">
        <div className="flex items-center justify-around h-[60px] px-2">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            const isExpanded = expandedCategory === cat.id;
            const badge = getBadge(cat.id);
            const statusColor = getStatus(cat.id);
            return (
              <motion.button key={cat.id} whileTap={{ scale: 0.9 }} onClick={() => handleCategoryClick(cat)}
                aria-label={`${cat.label}${badge ? ` (${badge})` : ''}`} aria-current={isActive ? 'page' : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[56px]",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}>
                <div className="relative">
                  <motion.div animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -1 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                    <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                  </motion.div>
                  {badge !== null && badge > 0 && (
                    <motion.span aria-live="polite" initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className={cn("absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold rounded-full",
                        statusColor === "danger" && "bg-destructive text-destructive-foreground",
                        statusColor === "warning" && "bg-warning text-warning-foreground",
                        (statusColor === "success" || !statusColor) && "bg-primary text-primary-foreground")}>
                      {badge > 99 ? "99+" : badge}
                    </motion.span>
                  )}
                  {statusColor && !badge && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className={cn("absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-card",
                        statusColor === "danger" && "bg-destructive", statusColor === "warning" && "bg-warning", statusColor === "success" && "bg-success")} />
                  )}
                </div>
                <span className={cn("text-[10px] font-medium truncate max-w-full", isActive && "font-semibold")}>{cat.label}</span>
                {isActive && <motion.div layoutId="activeIndicator" className="absolute -bottom-1 w-6 h-0.5 bg-primary rounded-full" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
                <AnimatePresence>{isActive && !isExpanded && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute -top-1"><ChevronUp className="h-3 w-3 text-muted-foreground/50" /></motion.div>
                )}</AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </nav>
      <div className="h-[60px] md:hidden" />
    </>
  );
}

export default BottomNavigation;
