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
      {open && shifts.length > 0 && (
        <div className="mt-1 max-w-xs rounded bg-black/85 text-white p-2 space-y-1 shadow-xl">
          <div className="opacity-70">{path}</div>
          {shifts.map((s, i) => (
            <div key={i} className="flex justify-between gap-2">
              <span className="truncate">{s.selector}</span>
              <span>{s.value.toFixed(3)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CLSBadge;
