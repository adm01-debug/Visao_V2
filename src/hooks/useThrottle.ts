import { useState, useEffect, useRef } from 'react';

export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  // eslint-disable-next-line react-hooks/purity -- Date.now() in useRef initializer runs once for throttle baseline
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();

    if (now >= lastUpdated.current + interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
      return undefined;
    }
    const timer = setTimeout(
      () => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      },
      interval - (now - lastUpdated.current)
    );

    return () => clearTimeout(timer);
  }, [value, interval]);

  return throttledValue;
}
