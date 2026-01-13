import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps { src: string; alt?: string; placeholder?: string; className?: string; }

export function LazyImage({ src, alt = '', placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6"/%3E%3C/svg%3E', className }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setInView(true); });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <img ref={ref} src={inView ? src : placeholder} alt={alt} onLoad={() => setLoaded(true)}
      className={cn('transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0', className)} />
  );
}

export default LazyImage;
