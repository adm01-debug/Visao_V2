/**
 * VISÃO - Category Status Indicator Component
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
  success: { bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/30" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/30" },
  danger: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30" },
  info: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30" },
  neutral: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" },
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
        className={cn(
          "absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center",
          "text-[10px] font-bold rounded-full",
          config.bg,
          config.text
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
