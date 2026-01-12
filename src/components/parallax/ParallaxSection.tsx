import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ParallaxSectionProps { backgroundImage: string; speed?: number; children: React.ReactNode; className?: string; }

export function ParallaxSection({ backgroundImage, speed = 0.5, children, className }: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      setOffset(rect.top * speed);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${backgroundImage})`, transform: `translateY(${offset}px)` }} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default ParallaxSection;
