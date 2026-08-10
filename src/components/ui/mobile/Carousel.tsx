/**
 * VISÃO - Carousel Component
 * Touch-friendly carousel with swipe, arrows, and indicators
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, useMotionValue, type PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselProps {
  items: React.ReactNode[];
  className?: string;
  showIndicators?: boolean;
  showArrows?: boolean;
  autoPlay?: boolean;
  interval?: number;
}

export function Carousel({
  items,
  className,
  showIndicators = true,
  showArrows = true,
  autoPlay = false,
  interval = 5000,
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(0, Math.min(index, items.length - 1)));
    },
    [items.length]
  );

  const goNext = useCallback(() => {
    goTo((currentIndex + 1) % items.length);
  }, [currentIndex, items.length, goTo]);

  const goPrev = useCallback(() => {
    goTo((currentIndex - 1 + items.length) % items.length);
  }, [currentIndex, items.length, goTo]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -50) goNext();
    else if (info.offset.x > 50) goPrev();
  };

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(goNext, interval);
    return () => clearInterval(timer);
  }, [autoPlay, interval, goNext]);

  return (
    <div className={cn('relative overflow-hidden', className)} ref={containerRef}>
      <motion.div
        className="flex"
        animate={{ x: `-${currentIndex * 100}%` }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
      >
        {items.map((item, index) => (
          <div key={index} className="w-full flex-shrink-0">
            {item}
          </div>
        ))}
      </motion.div>

      {showArrows && items.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-background transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-background transition-colors"
            aria-label="Próximo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {showIndicators && items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                index === currentIndex ? 'bg-primary w-6' : 'bg-primary/30 hover:bg-primary/50'
              )}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
