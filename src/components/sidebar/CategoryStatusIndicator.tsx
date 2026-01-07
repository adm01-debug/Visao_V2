import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type StatusType = "success" | "warning" | "danger" | "info" | "neutral";

interface CategoryStatusIndicatorProps {
  status: StatusType;
  label?: string;
  pulse?: boolean;
}

const statusConfig: Record<StatusType, { bg: string; ring: string; text: string }> = {
  success: {
    bg: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    bg: "bg-amber-500",
    ring: "ring-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  danger: {
    bg: "bg-red-500",
    ring: "ring-red-500/30",
    text: "text-red-600 dark:text-red-400",
  },
  info: {
    bg: "bg-blue-500",
    ring: "ring-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
  },
  neutral: {
    bg: "bg-muted-foreground/50",
    ring: "ring-muted-foreground/20",
    text: "text-muted-foreground",
  },
};

export function CategoryStatusIndicator({ status, label, pulse = false }: CategoryStatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <motion.div
          className={cn(
            "h-2 w-2 rounded-full ring-2",
            config.bg,
            config.ring
          )}
          animate={pulse ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        {pulse && (
          <motion.div
            className={cn(
              "absolute inset-0 h-2 w-2 rounded-full",
              config.bg
            )}
            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>
      {label && (
        <span className={cn("text-[10px] font-medium", config.text)}>
          {label}
        </span>
      )}
    </div>
  );
}
