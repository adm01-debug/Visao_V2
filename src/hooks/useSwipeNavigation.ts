/**
 * Hook para gestos de swipe em mobile
 * Permite navegar entre páginas com swipe horizontal
 */

import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface SwipeConfig {
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  enabled?: boolean;
}

interface NavigationRoute {
  path: string;
  label: string;
}

const MAIN_ROUTES: NavigationRoute[] = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/cameras", label: "Câmeras" },
  { path: "/alerts", label: "Alertas" },
  { path: "/analytics", label: "Analytics" },
  { path: "/people", label: "Pessoas" },
  { path: "/zones", label: "Zonas" },
  { path: "/settings", label: "Configurações" },
];

export function useSwipeNavigation({
  minSwipeDistance = 100,
  maxSwipeTime = 500,
  enabled = true,
}: SwipeConfig = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  const getCurrentRouteIndex = useCallback(() => {
    return MAIN_ROUTES.findIndex((route) => location.pathname === route.path);
  }, [location.pathname]);

  const navigateToRoute = useCallback(
    (direction: "left" | "right") => {
      const currentIndex = getCurrentRouteIndex();
      if (currentIndex === -1) return;

      let newIndex: number;
      if (direction === "left") {
        // Swipe left = go to next route
        newIndex = currentIndex + 1;
        if (newIndex >= MAIN_ROUTES.length) newIndex = 0;
      } else {
        // Swipe right = go to previous route
        newIndex = currentIndex - 1;
        if (newIndex < 0) newIndex = MAIN_ROUTES.length - 1;
      }

      navigate(MAIN_ROUTES[newIndex].path);
    },
    [getCurrentRouteIndex, navigate]
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // Only enable on mobile
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      // Reset
      touchStartRef.current = null;

      // Check if it's a valid horizontal swipe
      if (
        Math.abs(deltaX) < minSwipeDistance ||
        Math.abs(deltaY) > Math.abs(deltaX) * 0.5 ||
        deltaTime > maxSwipeTime
      ) {
        return;
      }

      // Determine direction
      if (deltaX > 0) {
        navigateToRoute("right");
      } else {
        navigateToRoute("left");
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, minSwipeDistance, maxSwipeTime, navigateToRoute]);

  return {
    currentRoute: MAIN_ROUTES[getCurrentRouteIndex()],
    routes: MAIN_ROUTES,
    containerRef,
  };
}
