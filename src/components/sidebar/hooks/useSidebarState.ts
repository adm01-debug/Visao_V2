/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook para gerenciar estado da Sidebar
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSidebarStatus, type SidebarStatus } from "@/hooks/useSidebarStatus";
import { createSidebarCategories } from "../config/categories";

const STORAGE_KEY = "sidebar-collapsed";

export function useSidebarState() {
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarStatus = useSidebarStatus();

  // Collapsed state with localStorage persistence
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) === "true";
    }
    return false;
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Generate categories with real data
  const categories = useMemo(
    () => createSidebarCategories(sidebarStatus),
    [sidebarStatus]
  );

  // Track which categories are expanded
  const [expandedCategories, setExpandedCategories] = useState<string[]>(() => {
    const defaultStatus: SidebarStatus = {
      unreadAlerts: 0,
      onlineCameras: 0,
      totalCameras: 0,
      activeRules: 0,
      totalRules: 0,
      registeredPersons: 0,
      activeZones: 0,
      isLoading: true,
    };
    const cats = createSidebarCategories(defaultStatus);
    const activeCategory = cats.find((cat) =>
      cat.items.some((item) => location.pathname.startsWith(item.path))
    );
    return activeCategory ? [activeCategory.id] : ["monitoring"];
  });

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  // Global Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const isCategoryExpanded = useCallback(
    (categoryId: string) => expandedCategories.includes(categoryId),
    [expandedCategories]
  );

  const isItemActive = useCallback(
    (path: string) =>
      location.pathname === path ||
      (path !== "/dashboard" && location.pathname.startsWith(path)),
    [location.pathname]
  );

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
      setMobileOpen(false);
    },
    [navigate]
  );

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return {
    // State
    collapsed,
    mobileOpen,
    searchOpen,
    categories,
    expandedCategories,
    sidebarStatus,

    // Setters
    setCollapsed,
    setMobileOpen,
    setSearchOpen,

    // Actions
    toggleCollapsed,
    toggleCategory,
    isCategoryExpanded,
    isItemActive,
    handleNavigate,
    closeMobile,
  };
}

export type UseSidebarStateReturn = ReturnType<typeof useSidebarState>;
