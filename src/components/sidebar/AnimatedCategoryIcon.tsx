import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimatedCategoryIconProps {
  icon: LucideIcon;
  isOpen: boolean;
  hasActivity?: boolean;
  className?: string;
}

export function AnimatedCategoryIcon({
  icon: Icon,
  isOpen,
  hasActivity = false,
  className,
}: AnimatedCategoryIconProps) {
  return (
    <motion.div
      className={cn("relative", className)}
      animate={{
        rotate: isOpen ? 0 : 0,
        scale: hasActivity ? [1, 1.1, 1] : 1,
      }}
      transition={{
        scale: { duration: 0.5, repeat: hasActivity ? Infinity : 0, repeatDelay: 2 },
      }}
    >
      <Icon className="h-4 w-4" />
      {hasActivity && (
        <motion.div
          className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}
