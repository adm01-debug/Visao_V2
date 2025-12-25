import { useCallback, useRef, useState } from 'react';

interface UseLongPressOptions {
  threshold?: number;
  onStart?: () => void;
  onFinish?: () => void;
  onCancel?: () => void;
}

interface UseLongPressReturn {
  isLongPressing: boolean;
  handlers: {
    onMouseDown: () => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    onTouchStart: () => void;
    onTouchEnd: () => void;
  };
}

export const useLongPress = (
  callback: () => void,
  options: UseLongPressOptions = {}
): UseLongPressReturn => {
  const { threshold = 500, onStart, onFinish, onCancel } = options;
  const [isLongPressing, setIsLongPressing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const start = useCallback(() => {
    isLongPressRef.current = false;
    onStart?.();
    
    timeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsLongPressing(true);
      callback();
    }, threshold);
  }, [callback, threshold, onStart]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (isLongPressRef.current) {
      onFinish?.();
    } else {
      onCancel?.();
    }
    
    setIsLongPressing(false);
  }, [onFinish, onCancel]);

  return {
    isLongPressing,
    handlers: {
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onTouchStart: start,
      onTouchEnd: cancel,
    },
  };
};

export default useLongPress;
