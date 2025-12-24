import { useEffect, useRef, useCallback } from "react";
interface UseInfiniteScrollOptions { threshold?: number; rootMargin?: string; }
export function useInfiniteScroll(callback: () => void, options: UseInfiniteScrollOptions = {}): React.RefObject<HTMLDivElement> {
  const { threshold = 0.1, rootMargin = "100px" } = options;
  const ref = useRef<HTMLDivElement>(null);
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting) callback();
  }, [callback]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(handleObserver, { threshold, rootMargin });
    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver, threshold, rootMargin]);
  return ref;
}
