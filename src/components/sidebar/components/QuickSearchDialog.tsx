/**
 * VISÃO - Quick Search Dialog Component (Cmd+K)
 */

import { memo, useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { NavCategory } from "../types";

interface QuickSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: NavCategory[];
  onNavigate: (path: string) => void;
}

export const QuickSearchDialog = memo(React.forwardRef(function QuickSearchDialog({
  open,
  onOpenChange,
  categories,
  onNavigate,
}: QuickSearchDialogProps, _ref) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const location = useLocation();

  // Flatten all items
  const allItems = useMemo(() => {
    return categories.flatMap((cat) =>
      cat.items.map((item) => ({ ...item, category: cat.label }))
    );
  }, [categories]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const lowerQuery = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(lowerQuery) ||
        item.category.toLowerCase().includes(lowerQuery) ||
        item.path.toLowerCase().includes(lowerQuery)
    );
  }, [query, allItems]);

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category]?.push(item);
    });
    return groups;
  }, [filteredItems]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            onNavigate(filteredItems[selectedIndex].path);
            onOpenChange(false);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filteredItems, selectedIndex, onNavigate, onOpenChange]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Reset selected index when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  let currentIndex = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Busca Rápida</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar seções..."
            className="border-0 p-0 h-auto focus-visible:ring-0 text-base placeholder:text-muted-foreground/60"
          />
          <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-80">
          <div className="p-2">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="mb-3 last:mb-0">
                <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {category}
                </p>
                {items.map((item) => {
                  currentIndex++;
                  const thisIndex = currentIndex;
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const isSelected = thisIndex === selectedIndex;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.path);
                        onOpenChange(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(thisIndex)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                        "hover:bg-accent/80 focus:bg-accent focus:outline-none",
                        isSelected && "bg-accent",
                        isActive && "text-primary"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span className={cn("flex-1 text-sm", isActive && "font-medium")}>
                        {item.label}
                      </span>
                      {item.badge !== undefined && Number(item.badge) > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-destructive/20 text-destructive">
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                        <span className="text-xs text-muted-foreground">Atual</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="py-8 text-center">
                <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma seção encontrada para "{query}"
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px]">↓</kbd>
              <span>navegar</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px]">↵</kbd>
              <span>selecionar</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px]">ESC</kbd>
            <span>fechar</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
});
