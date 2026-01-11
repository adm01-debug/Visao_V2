// Type declarations for DeviceMotionEvent permission
declare global {
  interface DeviceMotionEventStatic {
    requestPermission?(): Promise<'granted' | 'denied'>;
  }
  interface Window {
    DeviceMotionEvent: DeviceMotionEventStatic & typeof DeviceMotionEvent;
  }
}

/**
 * useDeviceMotion Hook
 * Device motion sensors
 */
import { useState, useEffect } from 'react';

export interface MotionData {
  acceleration: DeviceMotionEventAcceleration | null;
  accelerationIncludingGravity: DeviceMotionEventAcceleration | null;
  rotationRate: DeviceMotionEventRotationRate | null;
  interval: number;
}

export function useDeviceMotion() {
  const [motion, setMotion] = useState<MotionData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const isSupported = typeof window !== 'undefined' && 'DeviceMotionEvent' in window;

  useEffect(() => {
    if (!isSupported) return;
    const handler = (e: DeviceMotionEvent) => {
      setMotion({
        acceleration: e.acceleration,
        accelerationIncludingGravity: e.accelerationIncludingGravity,
        rotationRate: e.rotationRate,
        interval: e.interval,
      });
    };
    // Request permission on iOS 13+
    if (typeof (DeviceMotionEvent as DeviceMotionEventStatic).requestPermission === 'function') {
      (DeviceMotionEvent as DeviceMotionEventStatic).requestPermission()
        .then((response: string) => {
          if (response === 'granted') window.addEventListener('devicemotion', handler);
          else setError(new Error('Permission denied'));
        })
        .catch((e: Error) => setError(e));
    } else {
      window.addEventListener('devicemotion', handler);
    }
    return () => window.removeEventListener('devicemotion', handler);
  }, [isSupported]);

  return { motion, isSupported, error };
}
export default useDeviceMotion;
