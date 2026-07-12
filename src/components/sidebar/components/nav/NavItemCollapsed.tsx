import React, { memo, useCallback, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { prefetchRoute } from "@/lib/routePrefetch";
import type { NavItem } from "../../types";
import { getBadgeClasses } from "./getBadgeClasses";

interface NavItemCollapsedProps {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}

export const NavItemCollapsed = memo(React.forwardRef(function NavItemCollapsed({
  item,
  isActive,
  onClick,
}: NavItemCollapsedProps, _ref) {
  const Icon = item.icon;
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const rippleId = useRef(0);
  const prefetchedRef = useRef(false);

  const handlePrefetch = useCallback(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    prefetchRoute(item.path);
  }, [item.path]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = rippleId.current++;
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
    onClick?.();
  }, [onClick]);

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <NavLink
          to={item.path}
          data-testid={`nav-${item.id}`}
          onClick={handleClick}
          onMouseEnter={handlePrefetch}
          onFocus={handlePrefetch}
          onTouchStart={handlePrefetch}
          className={cn(

            "relative flex items-center justify-center px-2 py-2 rounded-lg text-sm overflow-hidden",
            "transition-all duration-200 ease-out",
            "text-sidebar-foreground/55",
            "hover:text-sidebar-foreground hover:bg-sidebar-accent/60 hover:scale-110",
            "hover:shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.1)]",
            "transition-all duration-300",
            isActive && [
              "bg-primary/12 text-primary",
              "hover:bg-primary/16 hover:text-primary",
              "shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.12),0_2px_8px_-2px_hsl(var(--primary)/0.1)]",
            ]
          )}
        >
          {ripples.map(ripple => (
            <span
              key={ripple.id}
              className="absolute rounded-full pointer-events-none animate-[sidebar-ripple_0.6s_ease-out_forwards]"
              style={{
                left: ripple.x,
                top: ripple.y,
                width: 0,
                height: 0,
                background: isActive
                  ? 'radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)'
                  : 'radial-gradient(circle, hsl(var(--foreground) / 0.1) 0%, transparent 70%)',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
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
}));
