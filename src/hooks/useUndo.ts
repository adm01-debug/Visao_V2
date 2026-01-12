import { useState, useCallback } from 'react';

export function useUndo<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);

  const set = useCallback((newState: T | ((prev: T) => T)) => {
    const value = typeof newState === 'function' ? (newState as (prev: T) => T)(state) : newState;
    const newHistory = history.slice(0, index + 1);
    newHistory.push(value);
    setHistory(newHistory);
    setIndex(newHistory.length - 1);
    setState(value);
  }, [state, history, index]);

  const undo = useCallback(() => {
    if (index > 0) { setIndex(index - 1); setState(history[index - 1]); }
  }, [index, history]);

  const redo = useCallback(() => {
    if (index < history.length - 1) { setIndex(index + 1); setState(history[index + 1]); }
  }, [index, history]);

  const reset = useCallback(() => {
    setHistory([initialState]); setIndex(0); setState(initialState);
  }, [initialState]);

  return { state, set, undo, redo, reset, canUndo: index > 0, canRedo: index < history.length - 1 };
}

export default useUndo;
