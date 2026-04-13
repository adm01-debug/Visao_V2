import React, { memo, useCallback, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { NavItem } from "../../types";
import { getBadgeClasses } from "./getBadgeClasses";

interface NavItemLinkProps {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}

export const NavItemLink = memo(React.forwardRef(function NavItemLink({
  item,
  isActive,
  onClick,
}: NavItemLinkProps, _ref) {
  const Icon = item.icon;
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const rippleId = useRef(0);

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
    <NavLink
      to={item.path}
      data-testid={`nav-${item.id}`}
      onClick={handleClick}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm group overflow-hidden",
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
              ? 'radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 70%)'
              : 'radial-gradient(circle, hsl(var(--foreground) / 0.08) 0%, transparent 70%)',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
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
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.15, y: -1 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
          className={cn(
            "ml-auto text-[10px] font-semibold h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full",
            "transition-shadow duration-300",
            getBadgeClasses(item.badgeVariant)
          )}
        >
          {typeof item.badge === "number" && item.badge > 99 ? "99+" : item.badge}
        </motion.span>
      )}
    </NavLink>
  );
}));
