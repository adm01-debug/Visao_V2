/**
 * VISÃO - Category Status Indicator Component
 * Uses semantic severity tokens for visual coherence
 */

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { CategoryStatus } from "../types";

interface CategoryStatusIndicatorProps {
  status: CategoryStatus;
  collapsed: boolean;
}

const statusConfig = {
  success: {
    bg: "bg-success/12",
    text: "text-success",
    border: "border-success/25",
    dot: "bg-success",
  },
  warning: {
    bg: "bg-[hsl(var(--severity-medium))]/12",
    text: "text-[hsl(var(--severity-medium))]",
    border: "border-[hsl(var(--severity-medium))]/25",
    dot: "bg-[hsl(var(--severity-medium))]",
  },
  danger: {
    bg: "bg-[hsl(var(--severity-critical))]/12",
    text: "text-[hsl(var(--severity-critical))]",
    border: "border-[hsl(var(--severity-critical))]/25",
    dot: "bg-[hsl(var(--severity-critical))]",
  },
  info: {
    bg: "bg-primary/12",
    text: "text-primary",
    border: "border-primary/25",
    dot: "bg-primary",
  },
  neutral: {
    bg: "bg-muted/60",
    text: "text-muted-foreground",
    border: "border-border/50",
    dot: "bg-muted-foreground",
  },
};

export const CategoryStatusIndicator = memo(function CategoryStatusIndicator({
  status,
  collapsed,
}: CategoryStatusIndicatorProps) {
  const config = statusConfig[status.type];

  if (collapsed) {
    return status.count !== undefined && status.count > 0 ? (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className={cn(
          "absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center",
          "text-[10px] font-bold rounded-full shadow-sm",
          config.bg,
          config.text,
          "border",
          config.border
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
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium",
        "border backdrop-blur-sm",
        config.bg,
        config.text,
        config.border
      )}
    >
      {status.count !== undefined && <span className="font-bold">{status.count}</span>}
      <span className="truncate max-w-[60px]">{status.label}</span>
    </motion.div>
  );
});
