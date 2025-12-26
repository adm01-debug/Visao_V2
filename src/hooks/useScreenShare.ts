/**
 * useScreenShare Hook
 * Screen sharing functionality
 */
import { useState, useCallback } from 'react';

export interface UseScreenShareOptions {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

export function useScreenShare(options: UseScreenShareOptions = { video: true }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startSharing = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia(options as DisplayMediaStreamOptions);
      mediaStream.getVideoTracks()[0].onended = () => { setStream(null); setIsSharing(false); };
      setStream(mediaStream);
      setIsSharing(true);
      setError(null);
      return mediaStream;
    } catch (e) { setError(e as Error); return null; }
  }, [options]);

  const stopSharing = useCallback(() => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
    setIsSharing(false);
  }, [stream]);

  return { stream, isSharing, error, startSharing, stopSharing };
}
export default useScreenShare;
