import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScrollToTopProps {
  threshold?: number;
  className?: string;
}

export function ScrollToTop({ threshold = 300, className }: ScrollToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > threshold);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  if (!visible) return null;

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={cn('fixed bottom-6 right-6 rounded-full shadow-lg z-50', className)}
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
}

export default ScrollToTop;
