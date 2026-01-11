import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  loading: boolean;
  error: GeolocationPositionError | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  accuracy: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number | null;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

export const useGeolocation = (options: UseGeolocationOptions = {}): GeolocationState & { refresh: () => void } => {
  const { enableHighAccuracy = false, timeout = 10000, maximumAge = 0, watch = false } = options;

  const [state, setState] = useState<GeolocationState>({
    loading: true,
    error: null,
    latitude: null,
    longitude: null,
    altitude: null,
    accuracy: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    timestamp: null,
  });

  const onSuccess = useCallback((position: GeolocationPosition) => {
    setState({
      loading: false,
      error: null,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude,
      accuracy: position.coords.accuracy,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp,
    });
  }, []);

  const onError = useCallback((error: GeolocationPositionError) => {
    setState(prev => ({ ...prev, loading: false, error }));
  }, []);

  const refresh = useCallback(() => {
    setState(prev => ({ ...prev, loading: true }));
    navigator.geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy, timeout, maximumAge });
  }, [enableHighAccuracy, timeout, maximumAge, onSuccess, onError]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, loading: false, error: { code: 0 as const, message: 'Geolocation not supported', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as any }));
      return;
    }

    if (watch) {
      const watchId = navigator.geolocation.watchPosition(onSuccess, onError, { enableHighAccuracy, timeout, maximumAge });
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy, timeout, maximumAge });
    }
  }, [watch, enableHighAccuracy, timeout, maximumAge, onSuccess, onError]);

  return { ...state, refresh };
};

export default useGeolocation;
