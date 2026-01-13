import { useState, useCallback } from 'react';

export function useArray<T>(initial: T[] = []) {
  const [array, setArray] = useState(initial);
  const push = useCallback((item: T) => setArray(a => [...a, item]), []);
  const remove = useCallback((index: number) => setArray(a => a.filter((_, i) => i !== index)), []);
  const update = useCallback((index: number, item: T) => setArray(a => a.map((v, i) => i === index ? item : v)), []);
  const clear = useCallback(() => setArray([]), []);
  return { array, set: setArray, push, remove, update, clear };
}
export default useArray;
