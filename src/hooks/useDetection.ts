import { useState, useCallback, useEffect, useRef } from 'react';

interface Detection {
  id: string;
  type: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  timestamp: number;
}

interface UseDetectionOptions {
  onDetection?: (detection: Detection) => void;
  minConfidence?: number;
  types?: string[];
}

export function useDetection(cameraId: string, options: UseDetectionOptions = {}) {
  const { onDetection, minConfidence = 0.5, types } = options;
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const start = useCallback(() => {
    setIsEnabled(true);
    // Em produção, conectaria a um WebSocket real
  }, []);

  const stop = useCallback(() => {
    setIsEnabled(false);
    wsRef.current?.close();
  }, []);

  const clearDetections = useCallback(() => setDetections([]), []);

  const addDetection = useCallback((detection: Detection) => {
    if (detection.confidence < minConfidence) return;
    if (types && !types.includes(detection.type)) return;
    setDetections(prev => [...prev.slice(-99), detection]);
    onDetection?.(detection);
  }, [minConfidence, types, onDetection]);

  useEffect(() => () => { wsRef.current?.close(); }, []);

  return { detections, isEnabled, start, stop, clearDetections, addDetection };
}

export default useDetection;
