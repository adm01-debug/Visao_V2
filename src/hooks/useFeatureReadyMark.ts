import { useEffect } from 'react';
import { markFeatureReady } from '@/lib/perfMetrics';

/**
 * Marca o instante em que uma feature pesada terminou de montar.
 * Uso: `useFeatureReadyMark("CameraMap")` dentro do componente lazy.
 * A métrica registra `performance.now()` desde `navigationStart`, permitindo
 * medir tempo até renderizar (útil para vendor-mapbox, vendor-ml, vendor-pdf, etc).
 */
export function useFeatureReadyMark(name: string, detail?: Record<string, unknown>): void {
  useEffect(() => {
    markFeatureReady(name, detail);
    // Executa apenas na montagem — remontagens não recontam.
  }, []);
}
