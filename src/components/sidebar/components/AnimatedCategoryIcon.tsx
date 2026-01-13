/**
 * VISÃO - Animated Category Icon Component
 */

import { memo } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryStatus } from "../types";

interface AnimatedCategoryIconProps {
  icon: LucideIcon;
  status: CategoryStatus;
  isExpanded: boolean;
  isActive: boolean;
}

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

export const AnimatedCategoryIcon = memo(function AnimatedCategoryIcon({
  icon: Icon,
  status,
  isExpanded,
  isActive,
}: AnimatedCategoryIconProps) {
  return (
    <div className="relative">
      <motion.div
        animate={{
          scale: isExpanded ? 1.1 : 1,
          rotate: isExpanded ? 5 : 0,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Icon
          className={cn(
            "h-4 w-4 transition-colors duration-200",
            isActive ? "text-primary" : statusColors[status.type]
          )}
        />
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
          <span
            className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-75",
              pulseColors[status.type]
            )}
          />
        </motion.span>
      )}
    </div>
  );
});
