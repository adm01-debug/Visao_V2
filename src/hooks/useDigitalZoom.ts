/**
 * Onda Shinobi 2 — useDigitalZoom
 *
 * Zoom digital (pan + zoom) puramente client-side, aplicado via CSS transform.
 * Não afeta o stream enviado à IA (Onda 1 — useAnalysisStream).
 *
 * Uso:
 *   const zoom = useDigitalZoom({ cameraId, containerRef, persist: true });
 *   <div ref={containerRef} onWheel={zoom.onWheel} ... />
 *   <img style={{ transform: zoom.transform }} />
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 8;
const STORAGE_PREFIX = 'visao.zoom.';

export interface ZoomState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const IDENTITY: ZoomState = { scale: 1, offsetX: 0, offsetY: 0 };

function clampScale(s: number) {
  if (!Number.isFinite(s)) return ZOOM_MIN;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s));
}

function clampState(state: ZoomState, width: number, height: number): ZoomState {
  const scale = clampScale(state.scale);
  const maxX = (width * (scale - 1)) / 2;
  const maxY = (height * (scale - 1)) / 2;
  return {
    scale,
    offsetX: Math.min(maxX, Math.max(-maxX, state.offsetX)),
    offsetY: Math.min(maxY, Math.max(-maxY, state.offsetY)),
  };
}

function loadPersisted(cameraId?: string): ZoomState | null {
  if (!cameraId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + cameraId);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.s !== 'number' || typeof p?.x !== 'number' || typeof p?.y !== 'number') return null;
    return { scale: p.s, offsetX: p.x, offsetY: p.y };
  } catch {
    return null;
  }
}

function persist(cameraId: string | undefined, s: ZoomState) {
  if (!cameraId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STORAGE_PREFIX + cameraId,
      JSON.stringify({ s: Number(s.scale.toFixed(4)), x: Math.round(s.offsetX), y: Math.round(s.offsetY) }),
    );
  } catch {
    /* quota exceeded / privacy mode — ignore */
  }
}

export interface UseDigitalZoomOptions {
  cameraId?: string;
  containerRef: React.RefObject<HTMLElement>;
  persist?: boolean;
  enabled?: boolean;
}

export function useDigitalZoom({ cameraId, containerRef, persist: shouldPersist = false, enabled = true }: UseDigitalZoomOptions) {
  const [state, setState] = useState<ZoomState>(() => {
    if (shouldPersist) {
      const loaded = loadPersisted(cameraId);
      if (loaded) return loaded;
    }
    return IDENTITY;
  });

  // Track pointer for pan
  const panRef = useRef<{ active: boolean; startX: number; startY: number; baseX: number; baseY: number }>({
    active: false, startX: 0, startY: 0, baseX: 0, baseY: 0,
  });

  // Track pinch for touch
  const pinchRef = useRef<{ active: boolean; startDist: number; startScale: number; centerX: number; centerY: number }>({
    active: false, startDist: 0, startScale: 1, centerX: 0, centerY: 0,
  });

  const getRect = () => containerRef.current?.getBoundingClientRect() ?? { width: 0, height: 0, left: 0, top: 0 } as DOMRect;

  const setClamped = useCallback((next: ZoomState) => {
    setState((prev) => {
      const rect = getRect();
      const w = rect.width || 1;
      const h = rect.height || 1;
      const clamped = clampState(next, w, h);
      if (clamped.scale === prev.scale && clamped.offsetX === prev.offsetX && clamped.offsetY === prev.offsetY) {
        return prev;
      }
      if (shouldPersist) persist(cameraId, clamped);
      return clamped;
    });
  }, [cameraId, shouldPersist, containerRef]);

  const zoomAtPoint = useCallback((cursorX: number, cursorY: number, factor: number) => {
    setState((prev) => {
      const rect = getRect();
      const w = rect.width || 1;
      const h = rect.height || 1;
      const newScale = clampScale(prev.scale * factor);
      if (newScale === prev.scale) return prev;
      const imgX = (cursorX - w / 2 - prev.offsetX) / prev.scale;
      const imgY = (cursorY - h / 2 - prev.offsetY) / prev.scale;
      const nextOffsetX = cursorX - w / 2 - imgX * newScale;
      const nextOffsetY = cursorY - h / 2 - imgY * newScale;
      const clamped = clampState({ scale: newScale, offsetX: nextOffsetX, offsetY: nextOffsetY }, w, h);
      if (shouldPersist) persist(cameraId, clamped);
      return clamped;
    });
  }, [cameraId, shouldPersist, containerRef]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!enabled) return;
    // Only intercept when user is actively zooming with modifier or when already zoomed.
    // Requires ctrl/shift OR current scale > 1 to avoid stealing regular scroll on pages.
    const wants = e.ctrlKey || e.shiftKey || state.scale > 1;
    if (!wants) return;
    e.preventDefault();
    const rect = getRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomAtPoint(cursorX, cursorY, factor);
  }, [enabled, state.scale, zoomAtPoint, containerRef]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!enabled || state.scale <= 1) return;
    // Only left button; ignore multi-touch (handled by touch handlers)
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    panRef.current = {
      active: true,
      startX: e.clientX, startY: e.clientY,
      baseX: state.offsetX, baseY: state.offsetY,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [enabled, state.scale, state.offsetX, state.offsetY]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!enabled || !panRef.current.active) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    setClamped({
      scale: state.scale,
      offsetX: panRef.current.baseX + dx,
      offsetY: panRef.current.baseY + dy,
    });
  }, [enabled, setClamped, state.scale]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    panRef.current.active = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || e.touches.length !== 2) return;
    const a = e.touches[0];
    const b = e.touches[1];
    if (!a || !b) return;
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    const dist = Math.hypot(dx, dy);
    const rect = getRect();
    pinchRef.current = {
      active: true,
      startDist: Math.max(1, dist),
      startScale: state.scale,
      centerX: (a.clientX + b.clientX) / 2 - rect.left,
      centerY: (a.clientY + b.clientY) / 2 - rect.top,
    };
  }, [enabled, state.scale, containerRef]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !pinchRef.current.active || e.touches.length !== 2) return;
    e.preventDefault();
    const a = e.touches[0];
    const b = e.touches[1];
    if (!a || !b) return;
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const targetScale = pinchRef.current.startScale * (dist / pinchRef.current.startDist);
    const factor = targetScale / state.scale;
    if (Math.abs(factor - 1) < 0.005) return;
    zoomAtPoint(pinchRef.current.centerX, pinchRef.current.centerY, factor);
  }, [enabled, state.scale, zoomAtPoint]);

  const onTouchEnd = useCallback(() => {
    pinchRef.current.active = false;
  }, []);

  const zoomIn = useCallback(() => {
    const rect = getRect();
    zoomAtPoint(rect.width / 2, rect.height / 2, 1.25);
  }, [zoomAtPoint, containerRef]);

  const zoomOut = useCallback(() => {
    const rect = getRect();
    zoomAtPoint(rect.width / 2, rect.height / 2, 1 / 1.25);
  }, [zoomAtPoint, containerRef]);

  const reset = useCallback(() => {
    setState(IDENTITY);
    if (shouldPersist && cameraId) {
      try { window.localStorage.removeItem(STORAGE_PREFIX + cameraId); } catch { /* ignore */ }
    }
  }, [cameraId, shouldPersist]);

  // Keyboard shortcuts (when container has focus)
  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn(); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomOut(); }
      else if (e.key === '0') { e.preventDefault(); reset(); }
      else if (state.scale > 1) {
        const step = 40;
        if (e.key === 'ArrowLeft') { e.preventDefault(); setClamped({ ...state, offsetX: state.offsetX + step }); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); setClamped({ ...state, offsetX: state.offsetX - step }); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setClamped({ ...state, offsetY: state.offsetY + step }); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); setClamped({ ...state, offsetY: state.offsetY - step }); }
      }
    };
    el.addEventListener('keydown', handler);
    return () => el.removeEventListener('keydown', handler);
  }, [enabled, zoomIn, zoomOut, reset, setClamped, state, containerRef]);

  const transform = useMemo(
    () => `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`,
    [state.offsetX, state.offsetY, state.scale],
  );

  return {
    scale: state.scale,
    offsetX: state.offsetX,
    offsetY: state.offsetY,
    transform,
    isZoomed: state.scale > 1.001,
    zoomIn, zoomOut, reset,
    onWheel, onPointerDown, onPointerMove, onPointerUp,
    onTouchStart, onTouchMove, onTouchEnd,
  };
}

export type UseDigitalZoomReturn = ReturnType<typeof useDigitalZoom>;
