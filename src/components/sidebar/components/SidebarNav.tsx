/**
 * VISÃO - Sidebar Navigation Component
 * Refactored: sub-components extracted to nav/ directory
 */

import React, { memo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { NavCategory } from '../types';
import { CategoryItem } from './nav/CategoryItem';

interface SidebarNavProps {
  categories: NavCategory[];
  collapsed: boolean;
  isMobile: boolean;
  expandedCategories: string[];
  onToggleCategory: (categoryId: string) => void;
  isItemActive: (path: string) => boolean;
  onNavigate?: () => void;
  isLoading?: boolean;
}

export const SidebarNav = memo(
  React.forwardRef(function SidebarNav(
    {
      categories,
      collapsed,
      isMobile,
      expandedCategories,
      onToggleCategory,
      isItemActive,
      onNavigate,
      isLoading,
    }: SidebarNavProps,
    _ref
  ) {
    const isCategoryExpanded = (categoryId: string) => expandedCategories.includes(categoryId);

    const isCategoryActive = (category: NavCategory) =>
      category.items.some((item) => isItemActive(item.path));

    return (
      <ScrollArea className="flex-1 px-3 py-2">
        <TooltipProvider>
          <nav className="space-y-1">
            {categories.map((category) => (
              <CategoryItem
                key={category.id}
                category={category}
                collapsed={collapsed && !isMobile}
                isExpanded={isCategoryExpanded(category.id)}
                isActive={isCategoryActive(category)}
                onToggle={() => onToggleCategory(category.id)}
                isItemActive={isItemActive}
                onNavigate={onNavigate}
                isLoading={isLoading}
              />
            ))}
          </nav>
        </TooltipProvider>
      </ScrollArea>
    );
  })
);
