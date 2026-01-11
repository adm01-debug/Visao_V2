import { useState, useEffect, useRef, useCallback } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

interface UseIntersectionObserverResult {
  ref: React.RefObject<HTMLElement>;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}

/**
 * Hook for observing element visibility
 * Useful for lazy loading, infinite scroll, animations
 * 
 * @example
 * const { ref, isIntersecting } = useIntersectionObserver({
 *   threshold: 0.1,
 *   freezeOnceVisible: true,
 * });
 */
export function useIntersectionObserver({
  threshold = 0,
  root = null,
  rootMargin = '0px',
  freezeOnceVisible = false,
}: UseIntersectionObserverOptions = {}): UseIntersectionObserverResult {
  const ref = useRef<HTMLElement>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  const frozen = useRef(false);

  const updateEntry = useCallback(([newEntry]: IntersectionObserverEntry[]) => {
    if (frozen.current) return;
    
    setEntry(newEntry);
    setIsIntersecting(newEntry.isIntersecting);
    
    if (freezeOnceVisible && newEntry.isIntersecting) {
      frozen.current = true;
    }
  }, [freezeOnceVisible]);

  useEffect(() => {
    const node = ref.current;
    const hasIOSupport = !!window.IntersectionObserver;
    
    if (!hasIOSupport || !node) return;

    const observerParams = { threshold, root, rootMargin };
    const observer = new IntersectionObserver(updateEntry, observerParams);

    observer.observe(node);

    return () => observer.disconnect();
  }, [threshold, root, rootMargin, updateEntry]);

  return { ref, isIntersecting, entry };
}

interface UseLazyImageResult {
  ref: React.RefObject<HTMLElement>;
  imageSrc: string;
  isLoaded: boolean;
}

/**
 * Hook for lazy loading images
 * 
 * @example
 * const { ref, imageSrc, isLoaded } = useLazyImage('/image.jpg', '/placeholder.jpg');
 */
export function useLazyImage(src: string, placeholder?: string): UseLazyImageResult {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    freezeOnceVisible: true,
  });
  
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isIntersecting && src) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      img.onerror = () => {
        setIsLoaded(true);
      };
    }
  }, [isIntersecting, src]);

  return { ref, imageSrc, isLoaded };
}

/**
 * Hook for infinite scroll
 * 
 * @example
 * const { ref } = useInfiniteScroll(() => loadMore());
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  options?: UseIntersectionObserverOptions
): { ref: React.RefObject<HTMLElement> } {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: 0,
    rootMargin: '100px',
    ...options,
  });

  useEffect(() => {
    if (isIntersecting) {
      onLoadMore();
    }
  }, [isIntersecting, onLoadMore]);

  return { ref };
}

export default useIntersectionObserver;
