import { useState, useCallback } from 'react';

export function useSet<T>(initial: Set<T> = new Set()) {
  const [set, setSet] = useState(initial);
  const add = useCallback((item: T) => setSet((s) => new Set(s).add(item)), []);
  const remove = useCallback(
    (item: T) =>
      setSet((s) => {
        const n = new Set(s);
        n.delete(item);
        return n;
      }),
    []
  );
  const toggle = useCallback(
    (item: T) =>
      setSet((s) => {
        const n = new Set(s);
        if (n.has(item)) {
          n.delete(item);
        } else {
          n.add(item);
        }
        return n;
      }),
    []
  );
  const clear = useCallback(() => setSet(new Set()), []);
  return { set, add, remove, toggle, clear, has: (item: T) => set.has(item) };
}
export default useSet;
