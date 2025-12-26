/**
 * useAmbientLight Hook
 * Ambient Light Sensor API
 */
import { useState, useEffect } from 'react';

export function useAmbientLight() {
  const [illuminance, setIlluminance] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const isSupported = typeof window !== 'undefined' && 'AmbientLightSensor' in window;

  useEffect(() => {
    if (!isSupported) return;
    try {
      const sensor = new (window as any).AmbientLightSensor();
      sensor.onreading = () => setIlluminance(sensor.illuminance);
      sensor.onerror = (e: any) => setError(new Error(e.error.message));
      sensor.start();
      return () => sensor.stop();
    } catch (e) { setError(e as Error); }
  }, [isSupported]);

  return { illuminance, isSupported, error };
}
export default useAmbientLight;
