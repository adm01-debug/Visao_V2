/**
 * CLSBadge - Indicador visual de CLS por rota. Apenas DEV.
 * Pode ser ocultado via querystring `?nocls=1`.
 */
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  getCurrentCLS,
  getShiftLog,
  getCurrentPath,
  subscribeCLS,
} from '@/lib/clsMonitor';

function thresholdClass(cls: number): string {
  if (cls < 0.1) return 'bg-emerald-500/90 text-white';
  if (cls < 0.25) return 'bg-amber-500/90 text-black';
  return 'bg-red-600/90 text-white';
}

export function CLSBadge() {
  const [, force] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeCLS(() => force((n) => n + 1));
    const interval = window.setInterval(() => force((n) => n + 1), 1000);
    return () => {
      unsub();
      window.clearInterval(interval);
    };
  }, []);

  if (!import.meta.env?.DEV) return null;
  if (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('nocls') === '1'
  ) {
    return null;
  }

  const cls = getCurrentCLS();
  const path = getCurrentPath();
  const shifts = getShiftLog().slice(-5).reverse();

  return (
    <div
      data-testid="cls-debug-badge"
      className="fixed bottom-2 right-2 z-[9999] font-mono text-xs select-none"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'px-2 py-1 rounded shadow-lg transition-colors',
          thresholdClass(cls)
        )}
        title={`CLS de ${path}`}
      >
        CLS {cls.toFixed(3)}
      </button>
      {open && (
        <div className="mt-1 max-w-xs rounded bg-black/85 text-white p-2 space-y-1 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <span className="opacity-70 truncate">{path}</span>
            <button
              type="button"
              onClick={() => {
                try {
                  const cur = window.localStorage.getItem('visao:cls-overlay:v1') === '1';
                  window.localStorage.setItem('visao:cls-overlay:v1', cur ? '0' : '1');
                } catch { /* ignore */ }
                // dispara evento sintético para o overlay reler (Alt+Shift+L equivalente)
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'L', altKey: true, shiftKey: true }));
              }}
              className="px-1.5 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[10px]"
              title="Marcar shifts no DOM (Alt+Shift+L)"
            >
              🎯 Marcar
            </button>
          </div>
          {shifts.length > 0 && shifts.map((s, i) => (
            <div key={i} className="flex justify-between gap-2">
              <span className="truncate">{s.selector}</span>
              <span>{s.value.toFixed(3)}</span>
            </div>
          ))}
          {shifts.length === 0 && (
            <div className="text-[11px] opacity-60">Nenhum shift ainda.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default CLSBadge;
