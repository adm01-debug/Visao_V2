import { useState, useEffect, useCallback, useRef } from "react";

export interface PerformanceMetrics {
  fps: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  } | null;
  latency: number;
  connectionType: string;
  downlink: number;
  cpuCores: number;
  deviceMemory: number;
}

export function usePerformanceMetrics(enabled: boolean = true) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memory: null,
    latency: 0,
    connectionType: "unknown",
    downlink: 0,
    cpuCores: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as any).deviceMemory || 0,
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafIdRef = useRef<number>();

  // FPS Calculator
  const calculateFPS = useCallback(() => {
    if (!enabled) return;

    frameCountRef.current++;
    const currentTime = performance.now();
    const elapsed = currentTime - lastTimeRef.current;

    if (elapsed >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / elapsed);
      frameCountRef.current = 0;
      lastTimeRef.current = currentTime;

      setMetrics((prev) => ({ ...prev, fps }));
    }

    rafIdRef.current = requestAnimationFrame(calculateFPS);
  }, [enabled]);

  // Memory Usage
  const updateMemory = useCallback(() => {
    if (!enabled) return;

    const perfMemory = (performance as any).memory;
    if (perfMemory) {
      const used = Math.round(perfMemory.usedJSHeapSize / 1048576);
      const total = Math.round(perfMemory.jsHeapSizeLimit / 1048576);
      const percentage = Math.round((used / total) * 100);

      setMetrics((prev) => ({
        ...prev,
        memory: { used, total, percentage },
      }));
    }
  }, [enabled]);

  // Network Latency
  const measureLatency = useCallback(async () => {
    if (!enabled) return;

    try {
      const start = performance.now();
      await fetch("/favicon.ico", { 
        method: "HEAD", 
        cache: "no-store",
        mode: "no-cors"
      });
      const latency = Math.round(performance.now() - start);

      setMetrics((prev) => ({ ...prev, latency }));
    } catch {
      // Silently fail
    }
  }, [enabled]);

  // Connection Info
  const updateConnectionInfo = useCallback(() => {
    if (!enabled) return;

    const connection = (navigator as any).connection;
    if (connection) {
      setMetrics((prev) => ({
        ...prev,
        connectionType: connection.effectiveType || "unknown",
        downlink: connection.downlink || 0,
      }));
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Start FPS calculation
    rafIdRef.current = requestAnimationFrame(calculateFPS);

    // Update memory every second
    const memoryInterval = setInterval(updateMemory, 1000);

    // Measure latency every 5 seconds
    measureLatency();
    const latencyInterval = setInterval(measureLatency, 5000);

    // Update connection info
    updateConnectionInfo();
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener("change", updateConnectionInfo);
    }

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      clearInterval(memoryInterval);
      clearInterval(latencyInterval);
      if (connection) {
        connection.removeEventListener("change", updateConnectionInfo);
      }
    };
  }, [enabled, calculateFPS, updateMemory, measureLatency, updateConnectionInfo]);

  return metrics;
}

export default usePerformanceMetrics;
