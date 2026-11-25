/**
 * VISÃO - Search Trigger Button Component
 */

import React, { memo } from 'react';
import { Search, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SearchTriggerProps {
  collapsed: boolean;
  onClick: () => void;
}

export const SearchTrigger = memo(
  React.forwardRef(function SearchTrigger({ collapsed, onClick }: SearchTriggerProps, _ref) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={onClick}
              className={cn(
                'w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground',
                'border-sidebar-border/60 hover:border-sidebar-border hover:bg-sidebar-accent/60',
                'transition-all duration-200',
                collapsed && 'justify-center px-2'
              )}
            >
              <Search className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-sm">Buscar...</span>
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-sidebar-border/80 bg-sidebar-accent/50 px-1.5 py-0.5 font-mono text-[10px] text-sidebar-foreground/60">
                    <Command className="h-3 w-3" />K
                  </kbd>
                </>
              )}
            </Button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">
              <p>Buscar (⌘K)</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  })
);
