import { useEffect, useRef } from 'react';

export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current++;
    const elapsed = performance.now() - startTime.current;
    if (import.meta.env.DEV && elapsed > 16) {
      console.warn(`[Performance] ${componentName} render #${renderCount.current} took ${elapsed.toFixed(2)}ms`);
    }
  });
}
