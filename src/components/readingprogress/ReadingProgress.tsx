import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ReadingProgressProps { className?: string; color?: string; }

export function ReadingProgress({ className, color = 'bg-primary' }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setProgress(Math.min(100, Math.max(0, progress)));
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={cn('fixed top-0 left-0 right-0 h-1 z-50', className)}>
      <div className={cn('h-full transition-all', color)} style={{ width: `${progress}%` }} />
    </div>
  );
}

export default ReadingProgress;
