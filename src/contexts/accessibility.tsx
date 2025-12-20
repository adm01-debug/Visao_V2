/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Acessibilidade (ARIA)
 * 
 * Componentes e hooks para acessibilidade:
 * - Skip links
 * - Anúncios para leitores de tela
 * - Navegação por teclado
 * - Focus management
 * - Landmarks ARIA
 * - Preferências de usuário
 */

import { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useEffect, 
  useRef,
  ReactNode,
  KeyboardEvent,
  forwardRef,
} from 'react';
import { cn } from '@/lib/utils';

// ============================================
// TIPOS
// ============================================

export interface AccessibilityPreferences {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
}

export interface Announcement {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
  timestamp: Date;
}

// ============================================
// CONTEXT
// ============================================

interface AccessibilityContextValue {
  preferences: AccessibilityPreferences;
  updatePreferences: (updates: Partial<AccessibilityPreferences>) => void;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  announcements: Announcement[];
  clearAnnouncements: () => void;
  focusMain: () => void;
  focusElement: (selector: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => {
    const saved = localStorage.getItem('visao-a11y-preferences');
    if (saved) {
      return JSON.parse(saved);
    }

    // Detectar preferências do sistema
    return {
      reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: more)').matches,
      largeText: false,
      screenReaderMode: false,
      keyboardNavigation: true,
      focusIndicators: true,
    };
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Salvar preferências
  useEffect(() => {
    localStorage.setItem('visao-a11y-preferences', JSON.stringify(preferences));

    // Aplicar classes globais
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', preferences.reduceMotion);
    root.classList.toggle('high-contrast', preferences.highContrast);
    root.classList.toggle('large-text', preferences.largeText);
    root.classList.toggle('keyboard-navigation', preferences.keyboardNavigation);
  }, [preferences]);

  // Detectar mudanças nas preferências do sistema
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, reduceMotion: e.matches }));
    };

    const handleContrastChange = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, highContrast: e.matches }));
    };

    motionQuery.addEventListener('change', handleMotionChange);
    contrastQuery.addEventListener('change', handleContrastChange);

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
    };
  }, []);

  // Atualizar preferências
  const updatePreferences = useCallback((updates: Partial<AccessibilityPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  // Anunciar para leitores de tela
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement: Announcement = {
      id: `announcement-${Date.now()}`,
      message,
      priority,
      timestamp: new Date(),
    };

    setAnnouncements(prev => [...prev, announcement]);

    // Limpar após 5 segundos
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== announcement.id));
    }, 5000);
  }, []);

  // Limpar anúncios
  const clearAnnouncements = useCallback(() => {
    setAnnouncements([]);
  }, []);

  // Focar no conteúdo principal
  const focusMain = useCallback(() => {
    const main = document.querySelector('main') || document.querySelector('[role="main"]');
    if (main instanceof HTMLElement) {
      main.focus();
    }
  }, []);

  // Focar em elemento específico
  const focusElement = useCallback((selector: string) => {
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement) {
      element.focus();
    }
  }, []);

  const value: AccessibilityContextValue = {
    preferences,
    updatePreferences,
    announce,
    announcements,
    clearAnnouncements,
    focusMain,
    focusElement,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {/* Live region para anúncios */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcements
          .filter(a => a.priority === 'polite')
          .map(a => (
            <div key={a.id}>{a.message}</div>
          ))}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {announcements
          .filter(a => a.priority === 'assertive')
          .map(a => (
            <div key={a.id}>{a.message}</div>
          ))}
      </div>
      {children}
    </AccessibilityContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  
  return context;
}

// ============================================
// COMPONENTES
// ============================================

/**
 * Skip Links - Navegação rápida para leitores de tela
 */
interface SkipLinksProps {
  links?: { href: string; label: string }[];
}

export function SkipLinks({ links = [] }: SkipLinksProps) {
  const defaultLinks = [
    { href: '#main-content', label: 'Pular para conteúdo principal' },
    { href: '#main-navigation', label: 'Pular para navegação' },
  ];

  const allLinks = [...defaultLinks, ...links];

  return (
    <nav aria-label="Skip links" className="skip-links">
      {allLinks.map((link, i) => (
        <a
          key={i}
          href={link.href}
          className={cn(
            'sr-only focus:not-sr-only',
            'fixed top-4 left-4 z-[9999]',
            'bg-primary text-primary-foreground',
            'px-4 py-2 rounded-md',
            'focus:outline-none focus:ring-2 focus:ring-ring'
          )}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}

/**
 * Visually Hidden - Conteúdo apenas para leitores de tela
 */
interface VisuallyHiddenProps {
  children: ReactNode;
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function VisuallyHidden({ children, as: Component = 'span' }: VisuallyHiddenProps) {
  return <Component className="sr-only">{children}</Component>;
}

/**
 * Focus Trap - Mantém foco dentro de um container
 */
interface FocusTrapProps {
  children: ReactNode;
  active?: boolean;
  onEscape?: () => void;
}

export function FocusTrap({ children, active = true, onEscape }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // Salvar foco anterior
    previousFocus.current = document.activeElement as HTMLElement;

    // Focar no primeiro elemento focável
    const container = containerRef.current;
    if (container) {
      const focusable = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }

    // Restaurar foco ao desmontar
    return () => {
      if (previousFocus.current) {
        previousFocus.current.focus();
      }
    };
  }, [active]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!active) return;

    if (e.key === 'Escape' && onEscape) {
      onEscape();
      return;
    }

    if (e.key !== 'Tab') return;

    const container = containerRef.current;
    if (!container) return;

    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
}

/**
 * Landmark - Container semântico com role ARIA
 */
interface LandmarkProps {
  children: ReactNode;
  role: 'banner' | 'navigation' | 'main' | 'complementary' | 'contentinfo' | 'region';
  label?: string;
  labelledBy?: string;
  id?: string;
  className?: string;
}

export const Landmark = forwardRef<HTMLElement, LandmarkProps>(
  ({ children, role, label, labelledBy, id, className }, ref) => {
    const Component = role === 'banner' ? 'header' 
      : role === 'navigation' ? 'nav'
      : role === 'main' ? 'main'
      : role === 'contentinfo' ? 'footer'
      : 'section';

    return (
      <Component
        ref={ref as any}
        role={role === 'region' ? 'region' : undefined}
        aria-label={label}
        aria-labelledby={labelledBy}
        id={id}
        className={className}
        tabIndex={role === 'main' ? -1 : undefined}
      >
        {children}
      </Component>
    );
  }
);
Landmark.displayName = 'Landmark';

/**
 * Live Region - Região que anuncia mudanças
 */
interface LiveRegionProps {
  children: ReactNode;
  mode?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  className?: string;
}

export function LiveRegion({ 
  children, 
  mode = 'polite', 
  atomic = true,
  relevant = 'additions',
  className,
}: LiveRegionProps) {
  return (
    <div
      aria-live={mode}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * Heading Level Context - Gerencia níveis de heading
 */
const HeadingLevelContext = createContext(1);

interface HeadingSectionProps {
  children: ReactNode;
}

export function HeadingSection({ children }: HeadingSectionProps) {
  const currentLevel = useContext(HeadingLevelContext);
  return (
    <HeadingLevelContext.Provider value={Math.min(currentLevel + 1, 6)}>
      {children}
    </HeadingLevelContext.Provider>
  );
}

interface AutoHeadingProps {
  children: ReactNode;
  className?: string;
}

export function AutoHeading({ children, className }: AutoHeadingProps) {
  const level = useContext(HeadingLevelContext);
  const Component = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  return <Component className={className}>{children}</Component>;
}

/**
 * Keyboard Navigation Hook
 */
interface UseKeyboardNavigationOptions {
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
}

export function useKeyboardNavigation(options: UseKeyboardNavigationOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        options.onEnter?.();
        break;
      case 'Escape':
        options.onEscape?.();
        break;
      case 'ArrowUp':
        e.preventDefault();
        options.onArrowUp?.();
        break;
      case 'ArrowDown':
        e.preventDefault();
        options.onArrowDown?.();
        break;
      case 'ArrowLeft':
        options.onArrowLeft?.();
        break;
      case 'ArrowRight':
        options.onArrowRight?.();
        break;
      case 'Home':
        e.preventDefault();
        options.onHome?.();
        break;
      case 'End':
        e.preventDefault();
        options.onEnd?.();
        break;
    }
  }, [options]);

  return { onKeyDown: handleKeyDown };
}

/**
 * Focus Management Hook
 */
export function useFocusManagement() {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemsRef = useRef<(HTMLElement | null)[]>([]);

  const registerItem = useCallback((index: number) => (el: HTMLElement | null) => {
    itemsRef.current[index] = el;
  }, []);

  const focusItem = useCallback((index: number) => {
    const items = itemsRef.current.filter(Boolean);
    if (index >= 0 && index < items.length) {
      items[index]?.focus();
      setFocusedIndex(index);
    }
  }, []);

  const focusNext = useCallback(() => {
    const items = itemsRef.current.filter(Boolean);
    const nextIndex = (focusedIndex + 1) % items.length;
    focusItem(nextIndex);
  }, [focusedIndex, focusItem]);

  const focusPrevious = useCallback(() => {
    const items = itemsRef.current.filter(Boolean);
    const prevIndex = (focusedIndex - 1 + items.length) % items.length;
    focusItem(prevIndex);
  }, [focusedIndex, focusItem]);

  const focusFirst = useCallback(() => focusItem(0), [focusItem]);
  const focusLast = useCallback(() => {
    const items = itemsRef.current.filter(Boolean);
    focusItem(items.length - 1);
  }, [focusItem]);

  return {
    focusedIndex,
    registerItem,
    focusItem,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
  };
}

/**
 * CSS para acessibilidade (adicionar ao global.css)
 */
export const accessibilityStyles = `
/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sr-only-focusable:focus,
.sr-only-focusable:active {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}

/* Reduced motion */
.reduce-motion * {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}

/* High contrast */
.high-contrast {
  --foreground: 0 0% 0%;
  --background: 0 0% 100%;
  --primary: 0 0% 0%;
  --border: 0 0% 0%;
}

.high-contrast .dark {
  --foreground: 0 0% 100%;
  --background: 0 0% 0%;
  --primary: 0 0% 100%;
  --border: 0 0% 100%;
}

/* Large text */
.large-text {
  font-size: 1.25rem;
}

.large-text h1 { font-size: 2.5rem; }
.large-text h2 { font-size: 2rem; }
.large-text h3 { font-size: 1.75rem; }
.large-text h4 { font-size: 1.5rem; }

/* Focus indicators */
.keyboard-navigation *:focus {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

.keyboard-navigation *:focus:not(:focus-visible) {
  outline: none;
}

.keyboard-navigation *:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
`;

// ============================================
// EXPORTS
// ============================================

export default useAccessibility;
