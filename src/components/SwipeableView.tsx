/**
 * Componente wrapper para habilitar gestos de swipe
 * Adiciona indicadores visuais de navegação
 */

import { ReactNode, useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableViewProps {
  children: ReactNode;
  className?: string;
}

const ROUTES = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/cameras", label: "Câmeras" },
  { path: "/alerts", label: "Alertas" },
  { path: "/analytics", label: "Analytics" },
  { path: "/people", label: "Pessoas" },
  { path: "/zones", label: "Zonas" },
  { path: "/settings", label: "Configurações" },
];

export function SwipeableView({ children, className }: SwipeableViewProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showIndicator, setShowIndicator] = useState<"left" | "right" | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const currentIndex = ROUTES.findIndex((r) => r.path === location.pathname);
  const prevRoute = currentIndex > 0 ? ROUTES[currentIndex - 1] : ROUTES[ROUTES.length - 1];
  const nextRoute = currentIndex < ROUTES.length - 1 ? ROUTES[currentIndex + 1] : ROUTES[0];

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const threshold = 100;
    const velocity = 500;

    if (info.offset.x > threshold || info.velocity.x > velocity) {
      // Swipe right - go to previous
      navigate(prevRoute.path);
    } else if (info.offset.x < -threshold || info.velocity.x < -velocity) {
      // Swipe left - go to next
      navigate(nextRoute.path);
    }

    setShowIndicator(null);
  };

  const handleDrag = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > 50) {
      setShowIndicator("right");
    } else if (info.offset.x < -50) {
      setShowIndicator("left");
    } else {
      setShowIndicator(null);
    }
  };

  if (!isMobile || currentIndex === -1) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Left indicator */}
      <AnimatePresence>
        {showIndicator === "right" && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2 bg-primary/90 text-primary-foreground rounded-full px-3 py-2 shadow-lg"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-xs font-medium">{prevRoute.label}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right indicator */}
      <AnimatePresence>
        {showIndicator === "left" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2 bg-primary/90 text-primary-foreground rounded-full px-3 py-2 shadow-lg"
          >
            <span className="text-xs font-medium">{nextRoute.label}</span>
            <ChevronRight className="h-4 w-4" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x, opacity }}
        className="w-full h-full"
      >
        {children}
      </motion.div>

      {/* Page dots indicator */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {ROUTES.map((route, index) => (
          <button
            key={route.path}
            onClick={() => navigate(route.path)}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              index === currentIndex
                ? "bg-primary w-4"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={`Ir para ${route.label}`}
          />
        ))}
      </div>
    </div>
  );
}
