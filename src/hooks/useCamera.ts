import { useState, useCallback, useRef, useEffect } from 'react';

interface UseCameraOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
}

interface CameraState {
  isConnected: boolean;
  isRecording: boolean;
  isLoading: boolean;
  error: Error | null;
  streamUrl: string | null;
}

export function useCamera(cameraId: string, options: UseCameraOptions = {}) {
  const { autoConnect = true, reconnectInterval = 5000 } = options;
  const [state, setState] = useState<CameraState>({
    isConnected: false, isRecording: false, isLoading: false, error: null, streamUrl: null
  });
  const reconnectRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      // Simulação - em produção seria chamada real
      await new Promise(r => setTimeout(r, 1000));
      setState(s => ({ ...s, isConnected: true, isLoading: false, streamUrl: `/api/stream/${cameraId}` }));
    } catch (err) {
      setState(s => ({ ...s, isLoading: false, error: err as Error }));
    }
  }, [cameraId]);

  const disconnect = useCallback(() => {
    setState(s => ({ ...s, isConnected: false, streamUrl: null }));
  }, []);

  const startRecording = useCallback(() => setState(s => ({ ...s, isRecording: true })), []);
  const stopRecording = useCallback(() => setState(s => ({ ...s, isRecording: false })), []);
  const takeSnapshot = useCallback(async () => `/api/snapshot/${cameraId}?t=${Date.now()}`, [cameraId]);

  useEffect(() => {
    if (autoConnect) connect();
    return () => { if (reconnectRef.current) clearTimeout(reconnectRef.current); };
  }, [autoConnect, connect]);

  return { ...state, connect, disconnect, startRecording, stopRecording, takeSnapshot };
}

export default useCamera;
