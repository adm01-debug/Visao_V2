import { useState, useEffect, useCallback } from 'react';

interface ScrollPosition { x: number; y: number; }

export function useWindowScroll(): [ScrollPosition, (options: ScrollToOptions) => void] {
  const [position, setPosition] = useState<ScrollPosition>({ x: 0, y: 0 });

  useEffect(() => {
    const handler = () => setPosition({ x: window.scrollX, y: window.scrollY });
    window.addEventListener('scroll', handler);
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = useCallback((options: ScrollToOptions) => window.scrollTo(options), []);

  return [position, scrollTo];
}

export default useWindowScroll;
