import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;
type KeyCombo = string;

export function useKeyboard(keyCombo: KeyCombo, handler: KeyHandler, deps: unknown[] = []) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const keys = keyCombo.toLowerCase().split('+');
    const ctrl = keys.includes('ctrl') || keys.includes('control');
    const alt = keys.includes('alt');
    const shift = keys.includes('shift');
    const meta = keys.includes('meta') || keys.includes('cmd');
    const key = keys.filter(k => !['ctrl','control','alt','shift','meta','cmd'].includes(k))[0];
    
    if (ctrl !== event.ctrlKey) return;
    if (alt !== event.altKey) return;
    if (shift !== event.shiftKey) return;
    if (meta !== event.metaKey) return;
    if (key && event.key.toLowerCase() !== key) return;
    
    event.preventDefault();
    handler(event);
  }, [keyCombo, handler, ...deps]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useEscapeKey(handler: () => void) {
  useKeyboard('escape', handler);
}

export function useEnterKey(handler: () => void) {
  useKeyboard('enter', handler);
}

export default useKeyboard;
