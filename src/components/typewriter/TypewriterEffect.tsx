import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TypewriterEffectProps { text: string; speed?: number; delay?: number; cursor?: boolean; onComplete?: () => void; className?: string; }

export function TypewriterEffect({ text, speed = 50, delay = 0, cursor = true, onComplete, className }: TypewriterEffectProps) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length < text.length) {
      const timeout = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), speed);
      return () => clearTimeout(timeout);
    } else {
      onComplete?.();
    }
  }, [started, displayed, text, speed, onComplete]);

  return (
    <span className={className}>
      {displayed}
      {cursor && <span className="animate-pulse">|</span>}
    </span>
  );
}

export default TypewriterEffect;
