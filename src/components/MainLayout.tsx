/**
 * VISÃO - Layout Principal Responsivo
 * Wrapper para páginas com sidebar e navegação mobile
 */

import { ReactNode } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
  /** Mostrar navegação inferior mobile */
  showMobileNav?: boolean;
  /** Classe adicional para o conteúdo principal */
  contentClassName?: string;
}

/**
 * Layout principal com sidebar (desktop) e navegação inferior (mobile)
 */
export function MainLayout({
  children,
  className,
  showMobileNav = true,
  contentClassName,
}: MainLayoutProps) {
  return (
    <div className={cn('flex min-h-screen bg-background', className)}>
      {/* Sidebar - visível apenas em desktop */}
      <Sidebar />

      {/* Conteúdo principal */}
      <main
        className={cn(
          'flex-1 overflow-auto',
          // Padding bottom para navegação mobile
          showMobileNav && 'pb-20 md:pb-0',
          contentClassName
        )}
      >
        {children}
      </main>

      {/* Navegação inferior mobile */}
      {showMobileNav && <MobileBottomNav />}
    </div>
  );
}

interface PageContentProps {
  children: ReactNode;
  className?: string;
  /** Padding padrão responsivo */
  padded?: boolean;
  /** Largura máxima do conteúdo */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

/**
 * Container de conteúdo de página com padding responsivo
 */
export function PageContent({
  children,
  className,
  padded = true,
  maxWidth = 'full',
}: PageContentProps) {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
  };

  return (
    <div
      className={cn(
        'w-full mx-auto',
        padded && 'px-4 py-4 sm:px-6 sm:py-6',
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  backButton?: ReactNode;
  className?: string;
}

/**
 * Header de página responsivo
 */
export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  backButton,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-4 sm:space-y-0', className)}>
      {/* Back button em mobile */}
      {backButton && (
        <div className="mb-2 sm:hidden">
          {backButton}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          {/* Back button em desktop */}
          {backButton && (
            <div className="hidden sm:block shrink-0">
              {backButton}
            </div>
          )}

          {icon && (
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              {icon}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2 sm:line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0 overflow-x-auto pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

interface SectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Seção de página com título opcional
 */
export function Section({
  children,
  title,
  description,
  actions,
  className,
}: SectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || actions) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && (
              <h2 className="text-lg font-semibold">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
