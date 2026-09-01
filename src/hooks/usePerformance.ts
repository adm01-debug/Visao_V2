import { logger } from '@/lib/logger';
import { useEffect, useRef, useState, RefObject } from 'react';

export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  // eslint-disable-next-line react-hooks/purity -- performance.now() in useRef initializer runs once for perf baseline
  const startTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current++;
    const elapsed = performance.now() - startTime.current;
    if (import.meta.env.DEV && elapsed > 16) {
      logger.warn(
        `[Performance] ${componentName} render #${renderCount.current} took ${elapsed.toFixed(2)}ms`
      );
    }
  });
}

export function useInView<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.1,
  rootMargin = '50px',
  triggerOnce = true,
}: { threshold?: number; rootMargin?: string; triggerOnce?: boolean } = {}): [
  RefObject<T | null>,
  boolean,
] {
  const ref = useRef<T>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry!.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) observer.unobserve(element);
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.unobserve(element);
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, isInView];
}
