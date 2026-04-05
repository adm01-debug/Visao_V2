/**
 * VISÃO - Sidebar Navigation Component
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
    <Collapsible open={isExpanded} onOpenChange={onToggle} className="mb-1">
      <CollapsibleTrigger asChild>
        <motion.button
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            isActive && "bg-sidebar-accent text-sidebar-primary",
            isExpanded && "bg-sidebar-accent/50"
          )}
        >
          <div className="flex items-center gap-2.5">
            <AnimatedCategoryIcon
              icon={CategoryIcon}
              status={status}
              isExpanded={isExpanded}
              isActive={isActive}
            />
            <span>{category.label}</span>
          </div>

          <div className="flex items-center gap-2">
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
              <NavItemLink item={item} isActive={isItemActive(item.path)} onClick={onNavigate} />
            </motion.div>
          ))}
        </motion.div>
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
                 className={cn(
                  "absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center",
                  "text-[9px] font-bold rounded-full",
                  status.type === "danger" && "bg-destructive text-destructive-foreground",
                  status.type === "warning" && "bg-warning text-warning-foreground",
                  status.type === "success" && "bg-success text-success-foreground",
                  status.type === "info" && "bg-primary text-primary-foreground",
                  status.type === "neutral" && "bg-muted-foreground text-background"
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
                status.type === "success" && "border-success/50 text-success",
                status.type === "warning" && "border-warning/50 text-warning",
                status.type === "danger" && "border-destructive/50 text-destructive",
                status.type === "info" && "border-primary/50 text-primary"
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
// NAV ITEM LINK
// ============================================

interface NavItemLinkProps {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}

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
        "relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm group",
        "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
        isActive &&
          "bg-sidebar-primary/12 text-sidebar-primary hover:bg-sidebar-primary/16 hover:text-sidebar-primary font-medium"
      )}
    >
      {/* Active route accent bar */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active-indicator"
          className="absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
      <Icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-sidebar-primary")} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && Number(item.badge) > 0 && (
        <Badge
          variant={item.badgeVariant || "secondary"}
          className="ml-auto text-xs h-5 min-w-[20px] justify-center"
        >
          {typeof item.badge === "number" && item.badge > 99 ? "99+" : item.badge}
        </Badge>
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
            "relative flex items-center justify-center px-2 py-2 rounded-lg transition-all duration-200 text-sm",
            "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            isActive &&
              "bg-sidebar-primary/12 text-sidebar-primary hover:bg-sidebar-primary/16 hover:text-sidebar-primary"
          )}
        >
          {isActive && (
            <motion.div
              layoutId="sidebar-active-indicator"
              className="absolute -left-1 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary"
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          )}
          <Icon className={cn("w-4 h-4", isActive && "text-primary-foreground")} />
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        {item.label}
        {item.badge !== undefined && Number(item.badge) > 0 && (
          <Badge variant={item.badgeVariant || "secondary"} className="text-xs">
            {item.badge}
          </Badge>
        )}
      </TooltipContent>
    </Tooltip>
  );
});
