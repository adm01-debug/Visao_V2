/**
 * VISÃO - Accessibility Hooks
 * Extracted from accessibility.tsx
 */
import { useState, useCallback, useRef } from 'react';
import type { KeyboardEvent } from 'react';

// ============================================
// KEYBOARD NAVIGATION
// ============================================

interface UseKeyboardNavigationOptions {
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
}

export function useKeyboardNavigation(options: UseKeyboardNavigationOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          options.onEnter?.();
          break;
        case 'Escape':
          options.onEscape?.();
          break;
        case 'ArrowUp':
          e.preventDefault();
          options.onArrowUp?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          options.onArrowDown?.();
          break;
        case 'ArrowLeft':
          options.onArrowLeft?.();
          break;
        case 'ArrowRight':
          options.onArrowRight?.();
          break;
        case 'Home':
          e.preventDefault();
          options.onHome?.();
          break;
        case 'End':
          e.preventDefault();
          options.onEnd?.();
          break;
      }
    },
    [options]
  );
  return { onKeyDown: handleKeyDown };
}

// ============================================
// FOCUS MANAGEMENT
// ============================================

export function useFocusManagement() {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemsRef = useRef<(HTMLElement | null)[]>([]);

  const registerItem = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      itemsRef.current[index] = el;
    },
    []
  );

  const focusItem = useCallback((index: number) => {
    const items = itemsRef.current.filter(Boolean);
    if (index >= 0 && index < items.length) {
      items[index]?.focus();
      setFocusedIndex(index);
    }
  }, []);

  const focusNext = useCallback(() => {
    const items = itemsRef.current.filter(Boolean);
    focusItem((focusedIndex + 1) % items.length);
  }, [focusedIndex, focusItem]);

  const focusPrevious = useCallback(() => {
    const items = itemsRef.current.filter(Boolean);
    focusItem((focusedIndex - 1 + items.length) % items.length);
  }, [focusedIndex, focusItem]);

  const focusFirst = useCallback(() => focusItem(0), [focusItem]);
  const focusLast = useCallback(() => {
    const items = itemsRef.current.filter(Boolean);
    focusItem(items.length - 1);
  }, [focusItem]);

  return { focusedIndex, registerItem, focusItem, focusNext, focusPrevious, focusFirst, focusLast };
}
