/**
 * Sidebar Subcomponents - Componentes reutilizáveis
 */

import { memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { NavItem, NavCategory, CategoryStatus } from "./types";

// ============================================
// ANIMATED CATEGORY ICON
// ============================================

interface AnimatedCategoryIconProps {
  icon: LucideIcon;
  status: CategoryStatus;
  isExpanded: boolean;
  isActive: boolean;
}

export const AnimatedCategoryIcon = memo(({ 
  icon: Icon, 
  status, 
  isExpanded,
  isActive 
}: AnimatedCategoryIconProps) => {
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
// CATEGORY STATUS INDICATOR
// ============================================

interface CategoryStatusIndicatorProps {
  status: CategoryStatus;
  collapsed: boolean;
}

export const CategoryStatusIndicator = memo(({ status, collapsed }: CategoryStatusIndicatorProps) => {
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
// NAV ITEM COMPONENT
// ============================================

interface NavItemComponentProps {
  item: NavItem;
  collapsed: boolean;
  onClick?: () => void;
}

export const NavItemComponent = memo(({ item, collapsed, onClick }: NavItemComponentProps) => {
  const location = useLocation();
  const isActive = location.pathname === item.path;
  const Icon = item.icon;

  const linkContent = (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium",
        "transition-all duration-200",
        "hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-primary/10 text-primary border-l-2 border-primary"
      )}
    >
      <Icon className={cn(
        "h-4 w-4 shrink-0 transition-transform duration-200",
        "group-hover:scale-110",
        isActive && "text-primary"
      )} />
      
      {!collapsed && (
        <span className="flex-1 truncate">{item.label}</span>
      )}
      
      {!collapsed && item.badge !== undefined && (
        <Badge 
          variant={item.badgeVariant || "secondary"} 
          className="ml-auto h-5 min-w-5 flex items-center justify-center text-[10px]"
        >
          {item.badge}
        </Badge>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {linkContent}
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          <span>{item.label}</span>
          {item.badge !== undefined && (
            <Badge variant={item.badgeVariant || "secondary"} className="h-5">
              {item.badge}
            </Badge>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
});
NavItemComponent.displayName = "NavItemComponent";

// ============================================
// CATEGORY GROUP COMPONENT
// ============================================

interface CategoryGroupProps {
  category: NavCategory;
  collapsed: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onItemClick?: () => void;
}

export const CategoryGroup = memo(({ 
  category, 
  collapsed, 
  isExpanded, 
  onToggle,
  onItemClick
}: CategoryGroupProps) => {
  const location = useLocation();
  const isActive = category.items.some(item => location.pathname === item.path);
  const status = category.getStatus?.() || { type: "neutral" as const, label: "" };
  const Icon = category.icon;

  if (collapsed) {
    return (
      <div className="space-y-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                "relative w-full flex items-center justify-center p-2 rounded-lg",
                "transition-colors duration-200",
                "hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-primary/10 text-primary"
              )}
            >
              <AnimatedCategoryIcon
                icon={Icon}
                status={status}
                isExpanded={false}
                isActive={isActive}
              />
              <CategoryStatusIndicator status={status} collapsed={true} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="p-0">
            <div className="py-2">
              <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground">
                {category.label}
              </p>
              <div className="space-y-0.5">
                {category.items.map(item => (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={onItemClick}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm",
                      "hover:bg-accent transition-colors",
                      location.pathname === item.path && "text-primary font-medium"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
            "transition-colors duration-200",
            "hover:bg-accent hover:text-accent-foreground",
            isActive && "bg-accent/50"
          )}
        >
          <AnimatedCategoryIcon
            icon={Icon}
            status={status}
            isExpanded={isExpanded}
            isActive={isActive}
          />
          
          <span className="flex-1 text-left text-sm font-medium">
            {category.label}
          </span>
          
          <CategoryStatusIndicator status={status} collapsed={false} />
          
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="pl-4 mt-1 space-y-0.5"
          >
            {category.items.map(item => (
              <NavItemComponent
                key={item.id}
                item={item}
                collapsed={false}
                onClick={onItemClick}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </CollapsibleContent>
    </Collapsible>
  );
});
CategoryGroup.displayName = "CategoryGroup";
