import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface ShortcutOptions {
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  preventDefault?: boolean;
}

export function useKeyboardShortcut(
  key: string,
  callback: KeyHandler,
  options: ShortcutOptions = {}
): void {
  const { ctrl = false, alt = false, shift = false, meta = false, preventDefault = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const keyMatch = event.key.toLowerCase() === key.toLowerCase();
      const ctrlMatch = ctrl === (event.ctrlKey || event.metaKey);
      const altMatch = alt === event.altKey;
      const shiftMatch = shift === event.shiftKey;
      const metaMatch = meta === event.metaKey;

      if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
        if (preventDefault) event.preventDefault();
        callback(event);
      }
    },
    [key, ctrl, alt, shift, meta, preventDefault, callback]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useEscapeKey(callback: KeyHandler): void {
  useKeyboardShortcut('Escape', callback);
}

export function useSaveShortcut(callback: KeyHandler): void {
  useKeyboardShortcut('s', callback, { ctrl: true });
}

export default useKeyboardShortcut;
