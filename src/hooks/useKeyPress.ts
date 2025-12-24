import { useEffect, useCallback } from "react";

export function useKeyPress(
  targetKey: string,
  callback: () => void,
  options: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}
) {
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      const keyMatch = event.key.toLowerCase() === targetKey.toLowerCase();
      const ctrlMatch = !!options.ctrl === (event.ctrlKey || event.metaKey);
      const shiftMatch = !!options.shift === event.shiftKey;
      const altMatch = !!options.alt === event.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        callback();
      }
    },
    [targetKey, callback, options]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);
}

export default useKeyPress;
