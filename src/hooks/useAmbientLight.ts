import { useState, useEffect } from 'react';

export interface AmbientLightState {
  illuminance: number | null;
  isSupported: boolean;
  error: string | null;
}

interface AmbientLightSensorInterface extends EventTarget {
  illuminance: number;
  start: () => void;
  stop: () => void;
  onerror: ((event: Event) => void) | null;
  onreading: ((event: Event) => void) | null;
}

declare global {
  interface Window { AmbientLightSensor?: new () => AmbientLightSensorInterface; }
}

export const useAmbientLight = (): AmbientLightState => {
  const [state, setState] = useState<AmbientLightState>({
    illuminance: null, isSupported: false, error: null,
  });

  useEffect(() => {
    if (!window.AmbientLightSensor) {
      setState(s => ({ ...s, error: 'AmbientLightSensor not supported' }));
      return;
    }

    try {
      const sensor = new window.AmbientLightSensor();
      
      sensor.onreading = () => {
        setState({ illuminance: sensor.illuminance, isSupported: true, error: null });
      };

      sensor.onerror = (event) => {
        const e = event as { error?: { message?: string } };
        setState(s => ({ ...s, error: e.error?.message || 'Sensor error' }));
      };

      sensor.start();
      setState(s => ({ ...s, isSupported: true }));

      return () => sensor.stop();
    } catch (e) {
      setState(s => ({ ...s, error: e instanceof Error ? e.message : 'Init failed' }));
    }
  }, []);

  return state;
};

export default useAmbientLight;
