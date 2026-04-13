/**
 * VISÃO - useSwipe Hook
 * Detecta gestos de swipe horizontal
 */
import { useRef, useCallback } from 'react';
import type React from 'react';

export function useSwipe(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold = 50
) {
  const startX = useRef(0);
  const startY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0]!.clientX;
    startY.current = e.touches[0]!.clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const endX = e.changedTouches[0]!.clientX;
    const endY = e.changedTouches[0]!.clientY;
    const diffX = endX - startX.current;
    const diffY = Math.abs(endY - startY.current);

    if (Math.abs(diffX) > threshold && diffY < 100) {
      if (diffX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (diffX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { handleTouchStart, handleTouchEnd };
}
