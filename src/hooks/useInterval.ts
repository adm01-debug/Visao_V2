import { useEffect, useRef, useCallback } from "react";

export const useInterval = (callback: () => void, delay: number | null) => {
  const savedCallback = useRef(callback);
  const intervalId = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const clear = useCallback(() => {
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
  }, []);

  useEffect(() => {
    if (delay === null) return;

    intervalId.current = setInterval(() => {
      savedCallback.current();
    }, delay);

    return clear;
  }, [delay, clear]);

  return clear;
};

export default useInterval;
