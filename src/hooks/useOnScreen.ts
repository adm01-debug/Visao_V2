import { useState, useEffect, useRef, RefObject } from 'react';

interface UseOnScreenOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
}

export const useOnScreen = <T extends Element>(
  options: UseOnScreenOptions = {}
): [RefObject<T>, boolean] => {
  const { root = null, rootMargin = '0px', threshold = 0, triggerOnce = false } = options;
  const ref = useRef<T>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        
        if (triggerOnce && entry.isIntersecting) {
          observer.unobserve(element);
        }
      },
      { root, rootMargin, threshold }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [root, rootMargin, threshold, triggerOnce]);

  return [ref, isIntersecting];
};

export default useOnScreen;
