/**
 * usePictureInPicture Hook
 * Picture-in-Picture API
 */
import { useState, useCallback, useEffect, useRef } from 'react';

export function usePictureInPicture() {
  const [isPiP, setIsPiP] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document;

  const setVideoRef = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
  }, []);

  const enter = useCallback(async () => {
    if (!videoRef.current || !isSupported) { setError(new Error('Not supported')); return; }
    try {
      await videoRef.current.requestPictureInPicture();
      setIsPiP(true);
      setError(null);
    } catch (e) { setError(e as Error); }
  }, [isSupported]);

  const exit = useCallback(async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      setIsPiP(false);
    }
  }, []);

  const toggle = useCallback(() => (isPiP ? exit() : enter()), [isPiP, enter, exit]);

  useEffect(() => {
    const onEnter = () => setIsPiP(true);
    const onLeave = () => setIsPiP(false);
    videoRef.current?.addEventListener('enterpictureinpicture', onEnter);
    videoRef.current?.addEventListener('leavepictureinpicture', onLeave);
    return () => {
      videoRef.current?.removeEventListener('enterpictureinpicture', onEnter);
      videoRef.current?.removeEventListener('leavepictureinpicture', onLeave);
    };
  }, []);

  return { isPiP, isSupported, error, setVideoRef, enter, exit, toggle };
}
export default usePictureInPicture;
