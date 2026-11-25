/**
 * VISÃO - Mobile Sidebar Component (Sheet Drawer)
 */

import React, { memo } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarContent } from './SidebarContent';
import type { UseSidebarStateReturn } from '../hooks/useSidebarState';

interface SidebarMobileProps {
  state: UseSidebarStateReturn;
}

export const SidebarMobile = memo(
  React.forwardRef(function SidebarMobile({ state }: SidebarMobileProps, _ref) {
    return (
      <Sheet open={state.mobileOpen} onOpenChange={state.setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            // z-30 (e nao z-50): o gatilho so precisa ficar acima do header
            // sticky (z-30, mesmo valor, empata pelo DOM) e abaixo do sheet
            // (z-50) e da BottomNavigation (z-50). Com z-50 ele ficava no
            // topo da pilha e interceptava o toque no backdrop do drawer e
            // contava como elemento interativo sobre a barra inferior.
            className="fixed top-4 left-4 z-30 md:hidden bg-background/80 backdrop-blur-sm shadow-sm"
            // O rotulo generico "Ação" nao dizia o que o botao fazia e ficava
            // identico a varios outros botoes de icone do app, o que quebra
            // leitor de tela e qualquer seletor por nome acessivel.
            aria-label="Abrir menu de navegação"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <SidebarContent state={state} isMobile />
        </SheetContent>
      </Sheet>
    );
  })
);
