import { useState, useEffect } from 'react';

interface UseMediaDevicesReturn {
  devices: MediaDeviceInfo[];
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useMediaDevices(): UseMediaDevicesReturn {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      setDevices(deviceList);
      setError(null);
    } catch (err) {
      setError(err as Error);
    }
  };

  useEffect(() => { refresh(); }, []);

  return { devices, error, refresh };
}

export default useMediaDevices;
