/**
 * VISÃO - Mobile Menu Checklist (DEV/QA only)
 *
 * Floating on-screen checklist that validates mobile drawer behavior in real time:
 *   ✓ Open/close state of the Radix Sheet drawer
 *   ✓ Body scroll lock applied while open
 *   ✓ Animation states observed (animating vs settled, last keyframe)
 *   ✓ Close after open (full lifecycle)
 *
 * Visible only when `import.meta.env.DEV` is true OR `?debug=mobile-menu` is in the URL.
 * Mobile-only (hidden on md+ breakpoints).
 */
import { useEffect, useState } from 'react';
import { Check, Circle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type CheckState = 'pending' | 'pass' | 'fail';

interface ChecklistItem {
  id: string;
  label: string;
  state: CheckState;
  detail?: string;
}

const initial: ChecklistItem[] = [
  { id: 'open', label: 'Drawer abre', state: 'pending' },
  { id: 'scroll-lock', label: 'Scroll bloqueado ao abrir', state: 'pending' },
  { id: 'anim-in', label: 'Animação de entrada detectada', state: 'pending' },
  { id: 'close', label: 'Drawer fecha', state: 'pending' },
  { id: 'anim-out', label: 'Animação de saída detectada', state: 'pending' },
  { id: 'scroll-unlock', label: 'Scroll restaurado ao fechar', state: 'pending' },
];

const isEnabled = () => {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('debug') === 'mobile-menu';
};

export function MobileMenuChecklist() {
  const [enabled] = useState(isEnabled);
  const [collapsed, setCollapsed] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>(initial);
  const [lastEvent, setLastEvent] = useState<string>('—');

  useEffect(() => {
    if (!enabled) return;

    const update = (id: string, state: CheckState, detail?: string) => {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, state, detail } : it)),
      );
    };

    let isOpen = false;
    let animStart: number | null = null;

    const findSheet = () =>
      document.querySelector<HTMLElement>('[data-state][role="dialog"]') ||
      document.querySelector<HTMLElement>('[data-radix-dialog-content][data-state]');

    const checkScrollLock = () => {
      const body = document.body;
      const html = document.documentElement;
      const locked =
        body.style.overflow === 'hidden' ||
        html.style.overflow === 'hidden' ||
        body.hasAttribute('data-scroll-locked');
      return locked;
    };

    const handleStateChange = (sheet: HTMLElement) => {
      const state = sheet.getAttribute('data-state');
      const opening = state === 'open' && !isOpen;
      const closing = state === 'closed' && isOpen;

      if (opening) {
        isOpen = true;
        animStart = performance.now();
        setLastEvent(`open @ ${new Date().toLocaleTimeString()}`);
        update('open', 'pass', 'data-state="open"');
        // Verify scroll lock shortly after open
        setTimeout(() => {
          update(
            'scroll-lock',
            checkScrollLock() ? 'pass' : 'fail',
            checkScrollLock() ? 'body overflow hidden' : 'sem lock detectado',
          );
        }, 50);
      }

      if (closing) {
        isOpen = false;
        animStart = performance.now();
        setLastEvent(`close @ ${new Date().toLocaleTimeString()}`);
        update('close', 'pass', 'data-state="closed"');
        setTimeout(() => {
          update(
            'scroll-unlock',
            !checkScrollLock() ? 'pass' : 'fail',
            !checkScrollLock() ? 'overflow restaurado' : 'ainda travado',
          );
        }, 400);
      }
    };

    const handleAnimation = (e: AnimationEvent) => {
      const target = e.target as HTMLElement;
      if (!target?.closest?.('[role="dialog"]')) return;
      const dur = animStart ? Math.round(performance.now() - animStart) : 0;
      if (e.type === 'animationend') {
        if (isOpen) {
          update('anim-in', 'pass', `${e.animationName} (${dur}ms)`);
        } else {
          update('anim-out', 'pass', `${e.animationName} (${dur}ms)`);
        }
      }
    };

    // Observe DOM for sheet appearance + state attribute changes
    const observer = new MutationObserver(() => {
      const sheet = findSheet();
      if (sheet) handleStateChange(sheet);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state'],
    });

    document.addEventListener('animationend', handleAnimation, true);
    document.addEventListener('animationstart', handleAnimation, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('animationend', handleAnimation, true);
      document.removeEventListener('animationstart', handleAnimation, true);
    };
  }, [enabled]);

  const reset = () => {
    setItems(initial);
    setLastEvent('—');
  };

  if (!enabled) return null;

  const passed = items.filter((i) => i.state === 'pass').length;
  const total = items.length;

  return (
    <div
      data-testid="mobile-menu-checklist"
      className={cn(
        'fixed z-[200] left-2 bottom-20 md:hidden',
        'rounded-lg border border-border bg-card/95 backdrop-blur shadow-lg',
        'text-xs font-mono',
        collapsed ? 'p-2' : 'p-3 w-[260px]',
      )}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between gap-2 font-semibold"
      >
        <span className="flex items-center gap-1.5">
          <Circle className="h-2 w-2 fill-primary text-primary" />
          QA Menu Mobile
        </span>
        <span className="text-muted-foreground">
          {passed}/{total}
        </span>
      </button>

      {!collapsed && (
        <>
          <ul className="mt-2 space-y-1">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-1.5">
                {item.state === 'pass' ? (
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                ) : item.state === 'fail' ? (
                  <X className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                ) : (
                  <Circle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/40" />
                )}
                <div className="flex-1 leading-tight">
                  <div
                    className={cn(
                      item.state === 'pass' && 'text-foreground',
                      item.state === 'fail' && 'text-destructive',
                      item.state === 'pending' && 'text-muted-foreground',
                    )}
                  >
                    {item.label}
                  </div>
                  {item.detail && (
                    <div className="text-[10px] text-muted-foreground truncate">
                      {item.detail}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground">
            <span className="truncate" title={lastEvent}>
              {lastEvent}
            </span>
            <button
              type="button"
              onClick={reset}
              className="rounded px-1.5 py-0.5 hover:bg-muted transition-colors"
            >
              reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default MobileMenuChecklist;
