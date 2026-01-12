import { useState, useEffect, useRef, useCallback } from 'react';

export function useAudioLevel(stream?: MediaStream) {
  const [level, setLevel] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>();

  const start = useCallback((mediaStream: MediaStream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(analyser);
    analyser.fftSize = 256;
    analyserRef.current = analyser;
    setIsActive(true);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const update = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setLevel(Math.round(avg / 255 * 100));
      animationRef.current = requestAnimationFrame(update);
    };
    update();
  }, []);

  const stop = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsActive(false);
    setLevel(0);
  }, []);

  useEffect(() => {
    if (stream) start(stream);
    return () => stop();
  }, [stream, start, stop]);

  return { level, isActive, start, stop };
}

export default useAudioLevel;
