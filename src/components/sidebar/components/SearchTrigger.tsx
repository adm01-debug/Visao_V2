/**
 * VISÃO - Search Trigger Button Component
 */

import { memo } from "react";
import { Search, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SearchTriggerProps {
  collapsed: boolean;
  onClick: () => void;
}

export const SearchTrigger = memo(function SearchTrigger({
  collapsed,
  onClick,
}: SearchTriggerProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            onClick={onClick}
            className={cn(
              "w-full justify-start gap-2 text-muted-foreground hover:text-foreground",
              "border-dashed hover:border-solid hover:bg-accent/50",
              collapsed && "justify-center px-2"
            )}
          >
            <Search className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left text-sm">Buscar...</span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
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
});
