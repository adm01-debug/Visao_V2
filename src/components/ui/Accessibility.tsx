import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// SKIP LINK (Pular para conteúdo principal)
// ============================================

interface SkipLinkProps {
  targetId?: string;
  className?: string;
}

export function SkipLink({ targetId = 'main-content', className }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        'sr-only focus:not-sr-only',
        'fixed top-4 left-4 z-[9999]',
        'px-4 py-2 rounded-md',
        'bg-primary text-primary-foreground font-medium',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'transition-all duration-200',
        className
      )}
    >
      Pular para conteúdo principal
    </a>
  );
}

// ============================================
// FOCUS TRAP (Armadilha de foco para modais)
// ============================================

interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}

export function FocusTrap({ children, active = true, className }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element on mount
    firstElement?.focus();

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

// ============================================
// LIVE REGION (Anúncios para leitores de tela)
// ============================================

type Politeness = 'polite' | 'assertive' | 'off';

interface LiveRegionProps {
  message: string;
  politeness?: Politeness;
  atomic?: boolean;
  className?: string;
}

export function LiveRegion({ 
  message, 
  politeness = 'polite',
  atomic = true,
  className 
}: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      className={cn('sr-only', className)}
    >
      {message}
    </div>
  );
}

// Hook for live announcements
export function useAnnounce() {
  const [message, setMessage] = useState('');
  const [politeness, setPoliteness] = useState<Politeness>('polite');

  const announce = useCallback((text: string, level: Politeness = 'polite') => {
    setPoliteness(level);
    setMessage('');
    // Small delay to ensure screen reader picks up the change
    setTimeout(() => setMessage(text), 100);
  }, []);

  const Announcer = () => (
    <LiveRegion message={message} politeness={politeness} />
  );

  return { announce, Announcer };
}

// ============================================
// VISUALLY HIDDEN (Conteúdo só para leitores)
// ============================================

interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

export function VisuallyHidden({ children, as: Component = 'span' }: VisuallyHiddenProps) {
  return (
    <Component className="sr-only">
      {children}
    </Component>
  );
}

// ============================================
// ACCESSIBLE ICON (Ícone com label)
// ============================================

interface AccessibleIconProps {
  icon: React.ReactNode;
  label: string;
  className?: string;
}

export function AccessibleIcon({ icon, label, className }: AccessibleIconProps) {
  return (
    <span className={className} role="img" aria-label={label}>
      {icon}
    </span>
  );
}

// ============================================
// KEYBOARD NAVIGATION HOOK
// ============================================

interface UseKeyboardNavigationOptions {
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  enabled?: boolean;
}

export function useKeyboardNavigation({
  onEnter,
  onEscape,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          onEnter?.();
          break;
        case 'Escape':
          onEscape?.();
          break;
        case 'ArrowUp':
          e.preventDefault();
          onArrowUp?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          onArrowDown?.();
          break;
        case 'ArrowLeft':
          onArrowLeft?.();
          break;
        case 'ArrowRight':
          onArrowRight?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onEnter, onEscape, onArrowUp, onArrowDown, onArrowLeft, onArrowRight]);
}

// ============================================
// ROVING TABINDEX (Navegação em grupos)
// ============================================

interface UseRovingTabindexOptions {
  itemCount: number;
  orientation?: 'horizontal' | 'vertical' | 'both';
  loop?: boolean;
}

export function useRovingTabindex({
  itemCount,
  orientation = 'vertical',
  loop = true,
}: UseRovingTabindexOptions) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    let newIndex = activeIndex;

    const isVertical = orientation === 'vertical' || orientation === 'both';
    const isHorizontal = orientation === 'horizontal' || orientation === 'both';

    if ((e.key === 'ArrowDown' && isVertical) || (e.key === 'ArrowRight' && isHorizontal)) {
      e.preventDefault();
      newIndex = activeIndex + 1;
      if (newIndex >= itemCount) {
        newIndex = loop ? 0 : itemCount - 1;
      }
    } else if ((e.key === 'ArrowUp' && isVertical) || (e.key === 'ArrowLeft' && isHorizontal)) {
      e.preventDefault();
      newIndex = activeIndex - 1;
      if (newIndex < 0) {
        newIndex = loop ? itemCount - 1 : 0;
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newIndex = itemCount - 1;
    }

    setActiveIndex(newIndex);
  }, [activeIndex, itemCount, orientation, loop]);

  const getTabIndex = (index: number) => index === activeIndex ? 0 : -1;

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
    getTabIndex,
  };
}

// ============================================
// REDUCED MOTION HOOK
// ============================================

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return reducedMotion;
}

// ============================================
// HIGH CONTRAST HOOK
// ============================================

export function useHighContrast(): boolean {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)');
    setHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return highContrast;
}

// ============================================
// SCREEN READER ONLY COMPONENT
// ============================================

interface SrOnlyProps {
  children: React.ReactNode;
  focusable?: boolean;
}

export function SrOnly({ children, focusable = false }: SrOnlyProps) {
  return (
    <span className={focusable ? 'sr-only focus:not-sr-only' : 'sr-only'}>
      {children}
    </span>
  );
}

// ============================================
// ARIA PROGRESS
// ============================================

interface AriaProgressProps {
  value: number;
  max?: number;
  min?: number;
  label: string;
  className?: string;
}

export function AriaProgress({ 
  value, 
  max = 100, 
  min = 0, 
  label,
  className 
}: AriaProgressProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={label}
      className={cn('w-full', className)}
    >
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <VisuallyHidden>
        {label}: {Math.round(percentage)}%
      </VisuallyHidden>
    </div>
  );
}
