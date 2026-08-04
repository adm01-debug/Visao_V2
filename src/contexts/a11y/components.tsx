/**
 * VISÃO - Accessibility Components
 * Extracted from accessibility.tsx
 */
import {
  createContext,
  useContext,
  useRef,
  useEffect,
  ReactNode,
  KeyboardEvent,
  forwardRef,
} from 'react';
import { cn } from '@/lib/utils';

// ============================================
// SKIP LINKS
// ============================================

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

// ============================================
// VISUALLY HIDDEN
// ============================================

interface VisuallyHiddenProps {
  children: ReactNode;
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function VisuallyHidden({ children, as: Component = 'span' }: VisuallyHiddenProps) {
  return <Component className="sr-only">{children}</Component>;
}

// ============================================
// FOCUS TRAP
// ============================================

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
    previousFocus.current = document.activeElement as HTMLElement;
    const container = containerRef.current;
    if (container) {
      const focusable = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) focusable[0]!.focus();
    }
    return () => {
      if (previousFocus.current) previousFocus.current.focus();
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
      last!.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first!.focus();
    }
  };

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
}

// ============================================
// LANDMARK
// ============================================

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
    const Component =
      role === 'banner'
        ? 'header'
        : role === 'navigation'
          ? 'nav'
          : role === 'main'
            ? 'main'
            : role === 'contentinfo'
              ? 'footer'
              : 'section';
    return (
      <Component
        ref={ref as React.Ref<HTMLElement>}
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

// ============================================
// LIVE REGION
// ============================================

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
    <div aria-live={mode} aria-atomic={atomic} aria-relevant={relevant} className={className}>
      {children}
    </div>
  );
}

// ============================================
// HEADING LEVEL CONTEXT
// ============================================

const HeadingLevelContext = createContext(1);

export function HeadingSection({ children }: { children: ReactNode }) {
  const currentLevel = useContext(HeadingLevelContext);
  return (
    <HeadingLevelContext.Provider value={Math.min(currentLevel + 1, 6)}>
      {children}
    </HeadingLevelContext.Provider>
  );
}

export function AutoHeading({ children, className }: { children: ReactNode; className?: string }) {
  const level = useContext(HeadingLevelContext);
  const Component = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  return <Component className={className}>{children}</Component>;
}
