/**
 * VISÃO - Stream State Management
 */
import { useState, useCallback } from 'react';
import {
  StreamState,
  StreamStatus,
  StreamStats,
  StreamError,
  StreamErrorCode,
  streamErrorMessages,
} from '@/types/streaming';

export const initialStats: StreamStats = {
  bitrate: 0,
  fps: 0,
  resolution: { width: 0, height: 0 },
  latency: 0,
  droppedFrames: 0,
  buffered: 0,
  connectionTime: 0,
  reconnectAttempts: 0,
};

export const initialState: StreamState = {
  status: 'disconnected',
  isPlaying: false,
  isMuted: true,
  volume: 1,
  currentQuality: 'auto',
  availableQualities: ['auto'],
  stats: initialStats,
  error: null,
  lastFrameTime: null,
  isFullscreen: false,
  showControls: true,
};

export function useStreamState(onError?: (error: StreamError) => void) {
  const [state, setState] = useState<StreamState>(initialState);

  const updateState = useCallback((updates: Partial<StreamState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setStatus = useCallback(
    (status: StreamStatus) => {
      updateState({ status });
    },
    [updateState]
  );

  const setError = useCallback(
    (code: StreamErrorCode, details?: string, recoverable = true) => {
      const error: StreamError = {
        code,
        message: streamErrorMessages[code],
        details,
        timestamp: new Date(),
        recoverable,
      };
      updateState({ status: 'error', error });
      onError?.(error);
    },
    [updateState, onError]
  );

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const resetState = useCallback(() => {
    setState(initialState);
  }, []);

  return { state, setState, updateState, setStatus, setError, clearError, resetState };
}
