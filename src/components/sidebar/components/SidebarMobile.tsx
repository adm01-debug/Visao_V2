/**
 * VISÃO - Mobile Sidebar Component (Sheet Drawer)
 */

import React, { memo } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarContent } from "./SidebarContent";
import type { UseSidebarStateReturn } from "../hooks/useSidebarState";

interface SidebarMobileProps {
  state: UseSidebarStateReturn;
}

export const SidebarMobile = memo(React.forwardRef(function SidebarMobile({
  state,
}: SidebarMobileProps, _ref) {
  return (
    <Sheet open={state.mobileOpen} onOpenChange={state.setMobileOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden bg-background/80 backdrop-blur-sm shadow-sm"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72">
        <SidebarContent state={state} isMobile />
      </SheetContent>
    </Sheet>
  );
}));
