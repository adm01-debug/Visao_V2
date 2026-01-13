/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Main Layout Component
 */

import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
}

function MainLayoutComponent({ children, className }: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar className="border-0" />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          showMenuButton
          onMenuToggle={() => setMobileMenuOpen(true)}
        />
        <main
          id="main-content"
          className={cn("flex-1 overflow-auto p-4 md:p-6", className)}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export const MainLayout = memo(MainLayoutComponent);
export default MainLayout;
