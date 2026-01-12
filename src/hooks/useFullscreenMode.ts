import { useState, useCallback, useEffect } from 'react';

export function useFullscreenMode(elementRef?: React.RefObject<HTMLElement>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enter = useCallback(() => {
    const elem = elementRef?.current || document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen();
  }, [elementRef]);

  const exit = useCallback(() => {
    if (document.exitFullscreen) document.exitFullscreen();
  }, []);

  const toggle = useCallback(() => {
    isFullscreen ? exit() : enter();
  }, [isFullscreen, enter, exit]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return { isFullscreen, enter, exit, toggle };
}

export default useFullscreenMode;
