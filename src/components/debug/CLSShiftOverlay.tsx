/**
 * CLSShiftOverlay — DEV-only. Sobrepõe rótulos visuais nas N maiores
 * fontes de layout shift da rota atual, posicionando boxes absolutos
 * em volta dos elementos reais (via WeakRef do clsMonitor).
 *
 * Toggle: tecla **Alt+Shift+L** ou botão "Marcar shifts" no badge CLS.
 * Oculto por padrão e em produção. Auto-atualiza durante 8s após o
 * load (para acompanhar shifts tardios) e em scroll/resize.
 */
import { useEffect, useState } from 'react';
import { getTopLiveSources, subscribeCLS } from '@/lib/clsMonitor';

interface OverlayBox {
  key: string;
  rect: { top: number; left: number; width: number; height: number };
  selector: string;
  value: number;
  rank: number;
}

const STORAGE_KEY = 'visao:cls-overlay:v1';

function readEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeEnabled(v: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function colorFor(rank: number): string {
  // Top 1 → vermelho, depois âmbar, depois azul (HSL via tokens).
  if (rank === 0) return 'hsl(var(--destructive))';
  if (rank <= 2) return 'hsl(var(--severity-medium, 35 92% 55%))';
  return 'hsl(var(--primary))';
}

function computeBoxes(): OverlayBox[] {
  const top = getTopLiveSources(5);
  return top
    .map((s, i) => {
      const r = s.element.getBoundingClientRect();
      return {
        key: `${i}-${s.selector}-${s.timestamp}`,
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        selector: s.selector,
        value: s.value,
        rank: i,
      };
    })
    .filter((b) => b.rect.width > 0 && b.rect.height > 0);
}

export function CLSShiftOverlay() {
  const [enabled, setEnabled] = useState<boolean>(() => readEnabled());
  const [boxes, setBoxes] = useState<OverlayBox[]>([]);

  // Toggle global Alt+Shift+L
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        setEnabled((v) => {
          const nv = !v;
          writeEnabled(nv);
          return nv;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Recalcula posições ao mudar rota / shifts / scroll / resize.
  useEffect(() => {
    if (!enabled) {
      setBoxes([]);
      return;
    }
    let raf = 0;
    const recompute = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setBoxes(computeBoxes()));
    };
    recompute();
    const unsub = subscribeCLS(recompute);
    window.addEventListener('scroll', recompute, true);
    window.addEventListener('resize', recompute);
    // Re-poll por 8s para capturar shifts tardios.
    const interval = window.setInterval(recompute, 500);
    const stop = window.setTimeout(() => window.clearInterval(interval), 8000);
    return () => {
      unsub();
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener('resize', recompute);
      window.clearInterval(interval);
      window.clearTimeout(stop);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!import.meta.env?.DEV) return null;
  if (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('nocls') === '1'
  ) {
    return null;
  }
  if (!enabled || boxes.length === 0) return null;

  return (
    <div
      data-testid="cls-shift-overlay"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9998]"
    >
      {boxes.map((b) => {
        const color = colorFor(b.rank);
        return (
          <div
            key={b.key}
            className="absolute font-mono text-[11px]"
            style={{
              top: b.rect.top,
              left: b.rect.left,
              width: b.rect.width,
              height: b.rect.height,
              outline: `2px dashed ${color}`,
              outlineOffset: '-2px',
              boxShadow: `inset 0 0 0 9999px ${color.replace(')', ' / 0.08)')}`,
              borderRadius: 4,
            }}
          >
            <span
              // eslint-disable-next-line visao/no-hardcoded-colors -- overlay debug DEV-only com legenda branca sobre cor dinâmica
              className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-white whitespace-nowrap"
              style={{ background: color }}
            >
              #{b.rank + 1} {b.selector} • +{b.value.toFixed(3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default CLSShiftOverlay;
