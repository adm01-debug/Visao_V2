/**
 * VISÃO - usePPEDetection (Refactored)
 * Composing from sub-hooks: usePPEVisionAI, usePPELocalML
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useMLModels } from './useMLModels';
import { usePPEVisionAI } from './ppe/usePPEVisionAI';
import { usePPELocalML } from './ppe/usePPELocalML';
import {
  PPEType, PPEConfig, PPEZone, PPEViolation, PPEStats,
  PersonPPEDetection, PPE_TYPES, PPE_LABELS, DEFAULT_PPE_CONFIG,
} from './ppe/types';
import type { PPEZoneConfig } from './ppe/types';

// Re-export types for consumers
export type { PPEType, PPEConfig, PPEZone, PPEViolation, PPEStats, PersonPPEDetection, PPEZoneConfig };
export type { PPEItem, PPEStatus } from './ppe/types';
export { PPE_TYPES, PPE_LABELS };

export interface UsePPEDetectionOptions {
  onViolation?: (violation: PPEViolation) => void;
  onCompliance?: (detection: PersonPPEDetection) => void;
  onError?: (error: Error) => void;
}

export function usePPEDetection(options: UsePPEDetectionOptions = {}) {
  const { onViolation, onCompliance, onError } = options;

  const [config, setConfig] = useState<PPEConfig>(DEFAULT_PPE_CONFIG);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detections, setDetections] = useState<PersonPPEDetection[]>([]);
  const [zones, setZones] = useState<PPEZone[]>([]);
  const [violations, setViolations] = useState<PPEViolation[]>([]);
  const [stats, setStats] = useState<PPEStats>({
    totalDetections: 0, compliantCount: 0, violationCount: 0, complianceRate: 100,
    byPPEType: {} as Record<PPEType, { detected: number; missing: number }>,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackingCache = useRef<Map<string, { lastSeen: number; trackingId: string }>>(new Map());

  const { detectObjects, detectPersons, isReady: mlReady } = useMLModels({ models: ['coco-ssd'], autoLoad: true });
  const { detectWithVisionAI } = usePPEVisionAI();
  const { detectWithLocalML } = usePPELocalML();

  // Main detection
  const detectPPE = useCallback(async (video: HTMLVideoElement, zoneConfig?: PPEZone): Promise<PersonPPEDetection[]> => {
    if (!video || video.readyState < 2) return [];
    const results: PersonPPEDetection[] = [];
    const requiredPPE = zoneConfig?.requiredPPE || ['helmet', 'vest'];

    try {
      const persons = await detectPersons(video);
      const allObjects = await detectObjects(video);
      if (persons.length === 0) return [];

      for (const person of persons) {
        const [x, y, width, height] = person.bbox;
        const personKey = `${Math.round(x / 50)}-${Math.round(y / 50)}`;
        let trackingId: string;
        const cached = trackingCache.current.get(personKey);
        if (cached && Date.now() - cached.lastSeen < 2000) { trackingId = cached.trackingId; }
        else { trackingId = `ppe-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`; }
        trackingCache.current.set(personKey, { lastSeen: Date.now(), trackingId });

        let items = config.useVisionAI
          ? await (async () => {
              const canvas = document.createElement('canvas');
              canvas.width = width; canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (!ctx) return [];
              ctx.drawImage(video, x, y, width, height, 0, 0, width, height);
              return detectWithVisionAI(canvas.toDataURL('image/jpeg', 0.8).split(',')[1] ?? '', requiredPPE as PPEType[]);
            })()
          : [];

        if (items.length === 0 && mlReady) {
          items = await detectWithLocalML(video, { x, y, width, height }, allObjects, requiredPPE as PPEType[]);
        }

        const missingItems = items.filter(i => i.status === 'missing').map(i => i.type);
        const isCompliant = missingItems.length === 0 && items.filter(i => i.status === 'detected').length >= requiredPPE.length * 0.5;

        const detection: PersonPPEDetection = {
          personId: `person-${results.length}`, trackingId,
          box: { x, y, width, height }, items, isCompliant, missingItems,
          timestamp: new Date(), cameraId: zoneConfig?.cameraId, zoneId: zoneConfig?.id,
        };
        results.push(detection);

        if (isCompliant) { onCompliance?.(detection); }
        else if (missingItems.length > 0 && config.alertOnViolation) {
          const violation: PPEViolation = {
            id: `viol-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            personId: detection.personId, zoneId: zoneConfig?.id || 'default',
            zoneName: zoneConfig?.name || 'Área Geral', cameraId: zoneConfig?.cameraId || 'unknown',
            missingItems, timestamp: new Date(), acknowledged: false,
          };
          onViolation?.(violation);
          setViolations(prev => [violation, ...prev].slice(0, 100));
        }
      }

      setDetections(results);
      setStats(prev => {
        const n = { ...prev };
        n.totalDetections += results.length;
        n.compliantCount += results.filter(r => r.isCompliant).length;
        n.violationCount += results.filter(r => !r.isCompliant && r.missingItems.length > 0).length;
        n.complianceRate = n.totalDetections > 0 ? (n.compliantCount / n.totalDetections) * 100 : 100;
        return n;
      });
      return results;
    } catch (err) { onError?.(err instanceof Error ? err : new Error(String(err))); return []; }
  }, [config, mlReady, detectObjects, detectPersons, detectWithVisionAI, detectWithLocalML, onViolation, onCompliance, onError]);

  const startContinuousDetection = useCallback((video: HTMLVideoElement, zoneConfig?: PPEZone) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsDetecting(true);
    intervalRef.current = setInterval(() => { detectPPE(video, zoneConfig); }, config.detectionInterval);
    detectPPE(video, zoneConfig);
  }, [detectPPE, config.detectionInterval]);

  const stopContinuousDetection = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsDetecting(false);
  }, []);

  // Zones CRUD (local state)
  const loadZones = useCallback(async () => { setZones([]); }, []);
  const createZone = useCallback(async (zone: Omit<PPEZone, 'id' | 'createdAt'>) => {
    const newZone: PPEZone = { id: crypto.randomUUID(), ...zone, createdAt: new Date() };
    setZones(prev => [newZone, ...prev]); toast.success('Zona PPE criada'); return newZone.id;
  }, []);
  const updateZone = useCallback(async (id: string, updates: Partial<PPEZone>) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, ...updates } : z)); toast.success('Zona atualizada');
  }, []);
  const deleteZone = useCallback(async (id: string) => {
    setZones(prev => prev.filter(z => z.id !== id)); toast.success('Zona removida');
  }, []);

  // Violations
  const loadViolations = useCallback(async (_limit = 50) => { setViolations([]); }, []);
  const acknowledgeViolation = useCallback(async (id: string) => {
    setViolations(prev => prev.map(v => v.id === id ? { ...v, acknowledged: true } : v));
  }, []);

  const updateConfig = useCallback((updates: Partial<PPEConfig>) => { setConfig(prev => ({ ...prev, ...updates })); }, []);

  useEffect(() => { loadZones(); loadViolations(); }, [loadZones, loadViolations]);
  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  return {
    isDetecting, detections, zones, violations, stats, config, ppeTypes: PPE_TYPES,
    detectPPE, startContinuousDetection, stopContinuousDetection,
    loadZones, createZone, updateZone, deleteZone,
    loadViolations, acknowledgeViolation, updateConfig,
  };
}

export default usePPEDetection;
