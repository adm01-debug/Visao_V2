/**
 * VISÃO - Sidebar Navigation Component
 * Premium hover states + semantic badge colors
 */

import { memo } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import type { NavItem, NavCategory, CategoryStatus } from "../types";
import { AnimatedCategoryIcon } from "./AnimatedCategoryIcon";
import { CategoryStatusIndicator } from "./CategoryStatusIndicator";

interface SidebarNavProps {
  categories: NavCategory[];
  collapsed: boolean;
  isMobile: boolean;
  expandedCategories: string[];
  onToggleCategory: (categoryId: string) => void;
  isItemActive: (path: string) => boolean;
  onNavigate?: () => void;
}

export const SidebarNav = memo(function SidebarNav({
  categories,
  collapsed,
  isMobile,
  expandedCategories,
  onToggleCategory,
  isItemActive,
  onNavigate,
}: SidebarNavProps) {
  const isCategoryExpanded = (categoryId: string) =>
    expandedCategories.includes(categoryId);

  const isCategoryActive = (category: NavCategory) =>
    category.items.some((item) => isItemActive(item.path));

  return (
    <ScrollArea className="flex-1 px-3 py-2">
      <TooltipProvider>
        <nav className="space-y-1">
          {categories.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              collapsed={collapsed && !isMobile}
              isExpanded={isCategoryExpanded(category.id)}
              isActive={isCategoryActive(category)}
              onToggle={() => onToggleCategory(category.id)}
              isItemActive={isItemActive}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      </TooltipProvider>
    </ScrollArea>
  );
});

// ============================================
// CATEGORY ITEM
// ============================================

interface CategoryItemProps {
  category: NavCategory;
  collapsed: boolean;
  isExpanded: boolean;
  isActive: boolean;
  onToggle: () => void;
  isItemActive: (path: string) => boolean;
  onNavigate?: () => void;
}

const CategoryItem = memo(function CategoryItem({
  category,
  collapsed,
  isExpanded,
  isActive,
  onToggle,
  isItemActive,
  onNavigate,
}: CategoryItemProps) {
  const CategoryIcon = category.icon;
  const status = category.getStatus?.() || { type: "neutral" as const, label: "" };

  if (collapsed) {
    return (
      <CollapsedCategory
        category={category}
        status={status}
        isActive={isActive}
        isItemActive={isItemActive}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle} className="mb-0.5">
      <CollapsibleTrigger asChild>
        <motion.button
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          layout
          transition={{ layout: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } }}
          className={cn(
            "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium",
            "transition-all duration-300 ease-out",
            "text-sidebar-foreground/65 hover:text-sidebar-foreground",
            "hover:bg-sidebar-accent/60 hover:shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.06)]",
            isActive && !isExpanded && "bg-sidebar-accent/60 text-sidebar-primary shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.08)]",
            isExpanded && "bg-sidebar-accent/40 text-sidebar-foreground"
          )}
        >
          <div className="flex items-center gap-2.5">
            <AnimatedCategoryIcon
              icon={CategoryIcon}
              status={status}
              isExpanded={isExpanded}
              isActive={isActive}
            />
            <motion.span
              animate={{ color: isExpanded ? 'hsl(var(--sidebar-foreground))' : undefined }}
              transition={{ duration: 0.3 }}
            >
              {category.label}
            </motion.span>
          </div>

          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              {!isExpanded && status.label && (
                <CategoryStatusIndicator status={status} collapsed={false} />
              )}
            </AnimatePresence>

            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, duration: 0.35 }}
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground/60" />
            </motion.div>
          </div>
        </motion.button>
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="mt-1 ml-4 space-y-0.5 border-l-2 border-primary/15 pl-3"
            >
              {category.items.map((item, index) => (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -12, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{
                    delay: index * 0.04,
                    duration: 0.3,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                >
                  <NavItemLink item={item} isActive={isItemActive(item.path)} onClick={onNavigate} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </CollapsibleContent>
    </Collapsible>
  );
});

// ============================================
// COLLAPSED CATEGORY
// ============================================

interface CollapsedCategoryProps {
  category: NavCategory;
  status: CategoryStatus;
  isActive: boolean;
  isItemActive: (path: string) => boolean;
  onNavigate?: () => void;
}

const CollapsedCategory = memo(function CollapsedCategory({
  category,
  status,
  isActive,
  isItemActive,
  onNavigate,
}: CollapsedCategoryProps) {
  const CategoryIcon = category.icon;

  return (
    <div className="space-y-1 mb-3 relative">
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="flex justify-center py-1 relative">
            <AnimatedCategoryIcon
              icon={CategoryIcon}
              status={status}
              isExpanded={false}
              isActive={isActive}
            />
            {status.count !== undefined && status.count > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className={cn(
                  "absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center",
                  "text-[9px] font-bold rounded-full border shadow-sm",
                  status.type === "danger" && "bg-[hsl(var(--severity-critical))]/15 text-[hsl(var(--severity-critical))] border-[hsl(var(--severity-critical))]/25",
                  status.type === "warning" && "bg-[hsl(var(--severity-medium))]/15 text-[hsl(var(--severity-medium))] border-[hsl(var(--severity-medium))]/25",
                  status.type === "success" && "bg-success/15 text-success border-success/25",
                  status.type === "info" && "bg-primary/15 text-primary border-primary/25",
                  status.type === "neutral" && "bg-muted text-muted-foreground border-border/50"
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
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-5",
                status.type === "success" && "border-success/40 text-success bg-success/10",
                status.type === "warning" && "border-[hsl(var(--severity-medium))]/40 text-[hsl(var(--severity-medium))] bg-[hsl(var(--severity-medium))]/10",
                status.type === "danger" && "border-[hsl(var(--severity-critical))]/40 text-[hsl(var(--severity-critical))] bg-[hsl(var(--severity-critical))]/10",
                status.type === "info" && "border-primary/40 text-primary bg-primary/10"
              )}
            >
              {status.count !== undefined && `${status.count} `}
              {status.label}
            </Badge>
          )}
        </TooltipContent>
      </Tooltip>

      {category.items.map((item) => (
        <NavItemCollapsed
          key={item.path}
          item={item}
          isActive={isItemActive(item.path)}
          onClick={onNavigate}
        />
      ))}
    </div>
  );
});

// ============================================
// NAV ITEM LINK — Premium hover states
// ============================================

interface NavItemLinkProps {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}

const getBadgeClasses = (variant?: string) => {
  switch (variant) {
    case "destructive":
      return "bg-[hsl(var(--severity-critical))]/12 text-[hsl(var(--severity-critical))] border border-[hsl(var(--severity-critical))]/20";
    case "warning":
      return "bg-[hsl(var(--severity-medium))]/12 text-[hsl(var(--severity-medium))] border border-[hsl(var(--severity-medium))]/20";
    case "success":
      return "bg-success/12 text-success border border-success/20";
    default:
      return "bg-primary/10 text-primary border border-primary/20";
  }
};

const NavItemLink = memo(function NavItemLink({
  item,
  isActive,
  onClick,
}: NavItemLinkProps) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      data-testid={`nav-${item.id}`}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm group",
        "transition-all duration-300 ease-out",
        "text-sidebar-foreground/55",
        "hover:text-sidebar-foreground hover:bg-sidebar-accent/60 hover:translate-x-0.5",
        "hover:shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.08)]",
        isActive && [
          "bg-primary/10 text-primary font-medium",
          "hover:bg-primary/14 hover:text-primary",
          "shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.12),0_2px_8px_-2px_hsl(var(--primary)/0.1)]",
        ]
      )}
    >
      {/* Active route accent bar */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active-indicator"
          className="absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
      <Icon className={cn(
        "w-4 h-4 flex-shrink-0 transition-colors duration-200",
        isActive ? "text-primary" : "text-muted-foreground/60 group-hover:text-sidebar-foreground/80"
      )} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && Number(item.badge) > 0 && (
        <span
          className={cn(
            "ml-auto text-[10px] font-semibold h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full",
            getBadgeClasses(item.badgeVariant)
          )}
        >
          {typeof item.badge === "number" && item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
    </NavLink>
  );
});

// ============================================
// NAV ITEM COLLAPSED
// ============================================

interface NavItemCollapsedProps {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}

const NavItemCollapsed = memo(function NavItemCollapsed({
  item,
  isActive,
  onClick,
}: NavItemCollapsedProps) {
  const Icon = item.icon;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <NavLink
          to={item.path}
          data-testid={`nav-${item.id}`}
          onClick={onClick}
          className={cn(
            "relative flex items-center justify-center px-2 py-2 rounded-lg text-sm",
            "transition-all duration-200 ease-out",
            "text-sidebar-foreground/55",
            "hover:text-sidebar-foreground hover:bg-sidebar-accent/50 hover:scale-105",
            isActive && [
              "bg-primary/12 text-primary",
              "hover:bg-primary/16 hover:text-primary",
              "shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.12)]",
            ]
          )}
        >
          {isActive && (
            <motion.div
              layoutId="sidebar-active-indicator"
              className="absolute -left-1 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}
          <Icon className={cn("w-4 h-4", isActive && "text-primary")} />
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        {item.label}
        {item.badge !== undefined && Number(item.badge) > 0 && (
          <span className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
            getBadgeClasses(item.badgeVariant)
          )}>
            {item.badge}
          </span>
        )}
      </TooltipContent>
    </Tooltip>
  );
});
