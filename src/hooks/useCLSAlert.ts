/**
 * useCLSAlert - DEV-only. Dispara um toast de alerta a cada vez que o
 * CLS da rota atual cruza 0.1, destacando a rota e o elemento principal
 * que causou o maior shift.
 *
 * - Apenas em DEV (`import.meta.env.DEV`).
 * - Um alerta por rota: o flag reseta quando o pathname muda.
 * - Pode ser desativado via querystring `?nocls=1` (mesmo guard do badge).
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { subscribeCLS, getCurrentCLS, getShiftLog, getCurrentPath } from '@/lib/clsMonitor';

const CLS_THRESHOLD = 0.1;

function isSilenced(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('nocls') === '1';
}

export function useCLSAlert(): void {
  const location = useLocation();
  const firedRef = useRef<string | null>(null);

  // Reseta o "já alertei" ao trocar de rota
  useEffect(() => {
    firedRef.current = null;
  }, [location.pathname]);

  useEffect(() => {
    if (!import.meta.env?.DEV) return;
    if (isSilenced()) return;

    const check = () => {
      const cls = getCurrentCLS();
      const path = getCurrentPath();
      if (cls < CLS_THRESHOLD) return;
      if (firedRef.current === path) return;
      firedRef.current = path;

      const top = [...getShiftLog()].sort((a, b) => b.value - a.value)[0];
      const selector = top?.selector ?? '<no-source>';
      const value = top?.value ?? 0;

      toast.warning(`CLS ${cls.toFixed(3)} em ${path}`, {
        description: `Maior shift: ${selector} (+${value.toFixed(3)})`,
        duration: 8000,
        action: {
          label: 'Ver relatório',
          onClick: () => {
            window.location.assign('/cls-report');
          },
        },
      });
    };

    // Verifica de imediato (caso o threshold já tenha sido cruzado)
    check();
    const unsub = subscribeCLS(check);
    return () => {
      unsub();
    };
  }, [location.pathname]);
}
