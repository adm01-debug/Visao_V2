/**
 * VISÃO - Layout Responsivo Base
 * Componentes auxiliares para responsividade consistente
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  /** Padding responsivo padrão */
  padded?: boolean;
  /** Container máximo centralizado */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

/**
 * Container responsivo com padding e max-width consistentes
 */
export function ResponsiveContainer({
  children,
  className,
  padded = true,
  maxWidth = 'full',
}: ResponsiveContainerProps) {
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
        padded && 'px-4 sm:px-6 lg:px-8',
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </div>
  );
}

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  /** Número de colunas em diferentes breakpoints */
  cols?: {
    default?: 1 | 2 | 3 | 4;
    sm?: 1 | 2 | 3 | 4;
    md?: 1 | 2 | 3 | 4 | 5 | 6;
    lg?: 1 | 2 | 3 | 4 | 5 | 6;
    xl?: 1 | 2 | 3 | 4 | 5 | 6;
  };
  gap?: 'sm' | 'md' | 'lg';
}

/**
 * Grid responsivo configurável
 */
export function ResponsiveGrid({
  children,
  className,
  cols = { default: 1, sm: 2, lg: 3, xl: 4 },
  gap = 'md',
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: 'gap-2 sm:gap-3',
    md: 'gap-3 sm:gap-4 lg:gap-6',
    lg: 'gap-4 sm:gap-6 lg:gap-8',
  };

  const colClasses = [
    cols.default && `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cn(
        'grid',
        colClasses || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

interface ResponsiveStackProps {
  children: ReactNode;
  className?: string;
  /** Direção responsiva: column em mobile, row em desktop */
  direction?: 'col-to-row' | 'row-to-col' | 'always-col' | 'always-row';
  gap?: 'xs' | 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
}

/**
 * Stack flexível com direção responsiva
 */
export function ResponsiveStack({
  children,
  className,
  direction = 'col-to-row',
  gap = 'md',
  align = 'start',
  justify = 'start',
}: ResponsiveStackProps) {
  const directionClasses = {
    'col-to-row': 'flex-col sm:flex-row',
    'row-to-col': 'flex-row sm:flex-col',
    'always-col': 'flex-col',
    'always-row': 'flex-row',
  };

  const gapClasses = {
    xs: 'gap-1 sm:gap-2',
    sm: 'gap-2 sm:gap-3',
    md: 'gap-3 sm:gap-4',
    lg: 'gap-4 sm:gap-6',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };

  return (
    <div
      className={cn(
        'flex',
        directionClasses[direction],
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        className
      )}
    >
      {children}
    </div>
  );
}

interface MobileOnlyProps {
  children: ReactNode;
  className?: string;
  /** Breakpoint onde esconde (padrão md) */
  hideAt?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Mostra conteúdo apenas em mobile
 */
export function MobileOnly({ children, className, hideAt = 'md' }: MobileOnlyProps) {
  const hideClasses = {
    sm: 'sm:hidden',
    md: 'md:hidden',
    lg: 'lg:hidden',
    xl: 'xl:hidden',
  };

  return (
    <div className={cn('block', hideClasses[hideAt], className)}>
      {children}
    </div>
  );
}

interface DesktopOnlyProps {
  children: ReactNode;
  className?: string;
  /** Breakpoint onde mostra (padrão md) */
  showAt?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Mostra conteúdo apenas em desktop
 */
export function DesktopOnly({ children, className, showAt = 'md' }: DesktopOnlyProps) {
  const showClasses = {
    sm: 'hidden sm:block',
    md: 'hidden md:block',
    lg: 'hidden lg:block',
    xl: 'hidden xl:block',
  };

  return (
    <div className={cn(showClasses[showAt], className)}>
      {children}
    </div>
  );
}

interface PageHeaderResponsiveProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Header de página responsivo padrão
 */
export function PageHeaderResponsive({
  title,
  subtitle,
  icon,
  actions,
  className,
}: PageHeaderResponsiveProps) {
  return (
    <div className={cn(
      'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
      className
    )}>
      <div className="flex items-start gap-3 sm:items-center">
        {icon && (
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          {actions}
        </div>
      )}
    </div>
  );
}

interface CardGridResponsiveProps {
  children: ReactNode;
  className?: string;
  /** Tamanho mínimo dos cards para auto-fit */
  minCardWidth?: number;
}

/**
 * Grid de cards com auto-fit responsivo
 */
export function CardGridResponsive({
  children,
  className,
  minCardWidth = 280,
}: CardGridResponsiveProps) {
  return (
    <div
      className={cn('grid gap-4', className)}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(min(${minCardWidth}px, 100%), 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Classes utilitárias para texto responsivo
 */
export const responsiveTextClasses = {
  'heading-1': 'text-2xl sm:text-3xl lg:text-4xl font-bold',
  'heading-2': 'text-xl sm:text-2xl lg:text-3xl font-bold',
  'heading-3': 'text-lg sm:text-xl lg:text-2xl font-semibold',
  'heading-4': 'text-base sm:text-lg font-semibold',
  'body-lg': 'text-base sm:text-lg',
  'body': 'text-sm sm:text-base',
  'body-sm': 'text-xs sm:text-sm',
  'caption': 'text-[10px] sm:text-xs',
};

/**
 * Classes utilitárias para espaçamento responsivo
 */
export const responsiveSpacingClasses = {
  'section-y': 'py-6 sm:py-8 lg:py-12',
  'section-x': 'px-4 sm:px-6 lg:px-8',
  'card-padding': 'p-4 sm:p-6',
  'gap-items': 'gap-3 sm:gap-4 lg:gap-6',
};
