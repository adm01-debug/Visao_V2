/**
 * VISÃO - Sistema de Vigilância Inteligente
 * MainLayout - Layout principal da aplicação
 *
 * Contrato de scroll/padding (única fonte de verdade):
 *   - O ÚNICO scroll container das páginas autenticadas é o `[data-app-scroll]`
 *     definido aqui (`SwipeableView`). Páginas NÃO devem criar containers de
 *     scroll próprios (overflow-y auto/scroll com altura fixa).
 *   - O padding da página (`p-4 md:p-6`), `min-h-full` e `mb-mobile-nav` ficam
 *     no `<main>` aqui. Páginas NÃO redeclaram nenhum desses.
 *   - Para conteúdo da página, use SEMPRE o componente `PageContent` (abaixo)
 *     para garantir espaçamento vertical consistente entre seções.
 *   - O guard runtime `mobileNavGuard` (DEV) avisa quando uma página viola
 *     este contrato.
 */

import { ReactNode } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { SwipeableView } from '@/components/SwipeableView';
import { SectionErrorBoundary } from '@/components/layout/SectionErrorBoundary';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { ShortcutsHelpDialog } from '@/components/ShortcutsHelpDialog';
import { PageTransition } from '@/components/ui/PageTransition';
import { RouteAnnouncer } from '@/components/ui/RouteAnnouncer';
import { PWAMigrationBanner } from '@/components/PWAMigrationBanner';
import { TestModeBanner } from '@/components/testMode/TestModeBanner';

import { useRouteCLS } from '@/hooks/useRouteCLS';
import { useCLSAlert } from '@/hooks/useCLSAlert';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { showHelp, setShowHelp, getShortcutsByCategory, formatShortcut } = useGlobalShortcuts();
  useRouteCLS();
  useCLSAlert();

  return (
    <div className="flex h-screen h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
      >
        Pular para conteúdo principal
      </a>
      <SectionErrorBoundary section="Sidebar">
        <Sidebar />
      </SectionErrorBoundary>
      <div className="flex flex-1 flex-col overflow-hidden">
        <SectionErrorBoundary section="Header">
          <Header />
        </SectionErrorBoundary>
        <SwipeableView className="flex-1 overflow-auto" data-app-scroll tabIndex={0}>
          <PWAMigrationBanner />
          <TestModeBanner />
          <main
            id="main-content"
            tabIndex={-1}
            className="p-4 md:p-6 mb-mobile-nav min-h-full"
            role="main"
            aria-label="Conteúdo principal"
          >
            <SectionErrorBoundary section="Conteúdo Principal">
              <PageTransition>{children}</PageTransition>
            </SectionErrorBoundary>
          </main>
        </SwipeableView>
      </div>
      <SectionErrorBoundary section="Navegação">
        <BottomNavigation />
      </SectionErrorBoundary>
      <ShortcutsHelpDialog
        open={showHelp}
        onOpenChange={setShowHelp}
        shortcutsByCategory={getShortcutsByCategory()}
        formatShortcut={formatShortcut}
      />
      <RouteAnnouncer />
    </div>
  );
}

/**
 * Container padrão para o conteúdo de páginas autenticadas.
 *
 * Garante:
 *   - Espaçamento vertical consistente entre seções (`space-y-6`).
 *   - Largura máxima centralizada opcional (props `maxWidth`).
 *   - Marca `data-page-content` para o guard runtime e testes E2E identificarem
 *     o root da página.
 *
 * NÃO aplica padding nem `mb-mobile-nav` — esses ficam no `<main>` do MainLayout
 * (única fonte de verdade — vide `mem://standards/mobile-nav-checklist`).
 *
 * Uso:
 *   <PageContent>
 *     <PageMeta ... />
 *     <SectionA />
 *     <SectionB />
 *   </PageContent>
 *
 *   <PageContent maxWidth="xl" className="lg:px-2">
 *     ...
 *   </PageContent>
 */
type MaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

interface PageContentProps {
  children: ReactNode;
  className?: string;
  /** Largura máxima do conteúdo (centralizado). Default: `full` (sem limite). */
  maxWidth?: MaxWidth;
  /** Espaçamento vertical entre filhos diretos. Default: `6`. */
  spacing?: 4 | 6 | 8;
}

const MAX_WIDTH_CLASS: Record<MaxWidth, string> = {
  sm: 'max-w-3xl mx-auto',
  md: 'max-w-5xl mx-auto',
  lg: 'max-w-6xl mx-auto',
  xl: 'max-w-7xl mx-auto',
  '2xl': 'max-w-[96rem] mx-auto',
  full: '',
};

const SPACING_CLASS = {
  4: 'space-y-4',
  6: 'space-y-6',
  8: 'space-y-8',
} as const;

export function PageContent({
  children,
  className,
  maxWidth = 'full',
  spacing = 6,
}: PageContentProps) {
  return (
    <div
      data-page-content
      className={cn(SPACING_CLASS[spacing], MAX_WIDTH_CLASS[maxWidth], className)}
    >
      {children}
    </div>
  );
}

export default MainLayout;
