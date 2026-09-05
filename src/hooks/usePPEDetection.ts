/**
 * VISÃO - usePPEDetection (Refactored)
 * Composing from sub-hooks: usePPEVisionAI, usePPELocalML
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useMLModels } from './useMLModels';
import { usePPEVisionAI } from './ppe/usePPEVisionAI';
import { usePPELocalML } from './ppe/usePPELocalML';
import { supabase } from '@/integrations/supabase/client';
import type { TablesUpdate } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  PPEType,
  PPEConfig,
  PPEZone,
  PPEViolation,
  PPEStats,
  PersonPPEDetection,
  PPE_TYPES,
  PPE_LABELS,
  DEFAULT_PPE_CONFIG,
} from './ppe/types';
import type { PPEZoneConfig } from './ppe/types';

// Re-export types for consumers
export type {
  PPEType,
  PPEConfig,
  PPEZone,
  PPEViolation,
  PPEStats,
  PersonPPEDetection,
  PPEZoneConfig,
};
export type { PPEItem, PPEStatus } from './ppe/types';
export { PPE_TYPES, PPE_LABELS };

export interface UsePPEDetectionOptions {
  onViolation?: (violation: PPEViolation) => void;
  onCompliance?: (detection: PersonPPEDetection) => void;
  onError?: (error: Error) => void;
}

export function usePPEDetection(options: UsePPEDetectionOptions = {}) {
  const { onViolation, onCompliance, onError } = options;
  const { user } = useAuth();
  const userId = user?.id;

  const [config, setConfig] = useState<PPEConfig>(DEFAULT_PPE_CONFIG);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detections, setDetections] = useState<PersonPPEDetection[]>([]);
  const [zones, setZones] = useState<PPEZone[]>([]);
  const [violations, setViolations] = useState<PPEViolation[]>([]);
  const [stats, setStats] = useState<PPEStats>({
    totalDetections: 0,
    compliantCount: 0,
    violationCount: 0,
    complianceRate: 100,
    byPPEType: {} as Record<PPEType, { detected: number; missing: number }>,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackingCache = useRef<Map<string, { lastSeen: number; trackingId: string }>>(new Map());
  const loadTriggered = useRef(false);

  const {
    detectObjects,
    detectPersons,
    isReady: mlReady,
    loadModel,
    error: mlError,
  } = useMLModels({ models: ['coco-ssd'], autoLoad: false });
  const { detectWithVisionAI } = usePPEVisionAI();
  const { detectWithLocalML } = usePPELocalML();

  // Main detection
  const detectPPE = useCallback(
    async (video: HTMLVideoElement, zoneConfig?: PPEZone): Promise<PersonPPEDetection[]> => {
      if (!video || video.readyState < 2) return [];

      // Lazy-load COCO-SSD once per session (CSP/erro = última tentativa)
      if (!loadTriggered.current) {
        loadTriggered.current = true;
        void loadModel('coco-ssd');
      }
      if (!mlReady) return [];
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
          if (cached && Date.now() - cached.lastSeen < 2000) {
            trackingId = cached.trackingId;
          } else {
            trackingId = `ppe-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
          }
          trackingCache.current.set(personKey, { lastSeen: Date.now(), trackingId });

          let items = config.useVisionAI
            ? await (async () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return [];
                ctx.drawImage(video, x, y, width, height, 0, 0, width, height);
                return detectWithVisionAI(
                  canvas.toDataURL('image/jpeg', 0.8).split(',')[1] ?? '',
                  requiredPPE as PPEType[]
                );
              })()
            : [];

          if (items.length === 0 && mlReady) {
            items = await detectWithLocalML(
              video,
              { x, y, width, height },
              allObjects,
              requiredPPE as PPEType[]
            );
          }

          const missingItems = items.filter((i) => i.status === 'missing').map((i) => i.type);
          const isCompliant =
            missingItems.length === 0 &&
            items.filter((i) => i.status === 'detected').length >= requiredPPE.length * 0.5;

          const detection: PersonPPEDetection = {
            personId: `person-${results.length}`,
            trackingId,
            box: { x, y, width, height },
            items,
            isCompliant,
            missingItems,
            timestamp: new Date(),
            cameraId: zoneConfig?.cameraId,
            zoneId: zoneConfig?.id,
          };
          results.push(detection);

          if (isCompliant) {
            onCompliance?.(detection);
          } else if (missingItems.length > 0 && config.alertOnViolation) {
            const violation: PPEViolation = {
              id: `viol-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              personId: detection.personId,
              zoneId: zoneConfig?.id || 'default',
              zoneName: zoneConfig?.name || 'Área Geral',
              cameraId: zoneConfig?.cameraId || 'unknown',
              missingItems,
              timestamp: new Date(),
              acknowledged: false,
            };
            onViolation?.(violation);
            setViolations((prev) => [violation, ...prev].slice(0, 100));
          }
        }

        setDetections(results);
        setStats((prev) => {
          const n = { ...prev };
          n.totalDetections += results.length;
          n.compliantCount += results.filter((r) => r.isCompliant).length;
          n.violationCount += results.filter(
            (r) => !r.isCompliant && r.missingItems.length > 0
          ).length;
          n.complianceRate =
            n.totalDetections > 0 ? (n.compliantCount / n.totalDetections) * 100 : 100;
          return n;
        });
        return results;
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
        return [];
      }
    },
    [
      config,
      mlReady,
      detectObjects,
      detectPersons,
      detectWithVisionAI,
      detectWithLocalML,
      onViolation,
      onCompliance,
      onError,
    ]
  );

  const startContinuousDetection = useCallback(
    (video: HTMLVideoElement, zoneConfig?: PPEZone) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsDetecting(true);
      intervalRef.current = setInterval(() => {
        detectPPE(video, zoneConfig);
      }, config.detectionInterval);
      detectPPE(video, zoneConfig);
    },
    [detectPPE, config.detectionInterval]
  );

  const stopContinuousDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsDetecting(false);
  }, []);

  // Zones CRUD (Supabase)
  const loadZones = useCallback(async () => {
    if (!userId) {
      setZones([]);
      return;
    }
    const { data, error } = await supabase
      .from('ppe_zones')
      .select('id, name, camera_id, required_ppe, alert_on_violation, grace_period_seconds, polygon, created_at')
      .order('name');
    if (error) {
      toast.error('Falha ao carregar zonas PPE', { description: error.message });
      setZones([]);
      return;
    }
    setZones(
      (data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        cameraId: r.camera_id ?? '',
        requiredPPE: (r.required_ppe ?? []) as PPEType[],
        alertEnabled: r.alert_on_violation ?? true,
        gracePeriodSeconds: r.grace_period_seconds ?? 5,
        polygon: (r.polygon as { x: number; y: number }[] | null) ?? undefined,
        createdAt: new Date(r.created_at ?? Date.now()),
      })),
    );
  }, [userId]);
  const createZone = useCallback(
    async (zone: Omit<PPEZone, 'id' | 'createdAt'>) => {
      if (!userId) {
        toast.error('Sessão expirada');
        return '';
      }
      const { data, error } = await supabase
        .from('ppe_zones')
        .insert({
          name: zone.name,
          camera_id: zone.cameraId,
          required_ppe: zone.requiredPPE,
          alert_on_violation: zone.alertEnabled,
          grace_period_seconds: zone.gracePeriodSeconds,
          polygon: zone.polygon ?? null,
          user_id: userId,
        })
        .select('id')
        .single();
      if (error) {
        toast.error('Falha ao criar zona', { description: error.message });
        return '';
      }
      const newZone: PPEZone = { id: data.id, ...zone, createdAt: new Date() };
      setZones((prev) => [newZone, ...prev]);
      toast.success('Zona PPE criada');
      return newZone.id;
    },
    [userId],
  );
  const updateZone = useCallback(async (id: string, updates: Partial<PPEZone>) => {
    const patch: TablesUpdate<'ppe_zones'> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.cameraId !== undefined) patch.camera_id = updates.cameraId;
    if (updates.requiredPPE !== undefined) patch.required_ppe = updates.requiredPPE;
    if (updates.alertEnabled !== undefined) patch.alert_on_violation = updates.alertEnabled;
    if (updates.gracePeriodSeconds !== undefined) patch.grace_period_seconds = updates.gracePeriodSeconds;
    if (updates.polygon !== undefined) patch.polygon = updates.polygon;
    patch.updated_at = new Date().toISOString();
    const { error } = await supabase.from('ppe_zones').update(patch).eq('id', id);
    if (error) {
      toast.error('Falha ao atualizar zona', { description: error.message });
      return;
    }
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...updates } : z)));
    toast.success('Zona atualizada');
  }, []);
  const deleteZone = useCallback(async (id: string) => {
    const { error } = await supabase.from('ppe_zones').delete().eq('id', id);
    if (error) {
      toast.error('Falha ao remover zona', { description: error.message });
      return;
    }
    setZones((prev) => prev.filter((z) => z.id !== id));
    toast.success('Zona removida');
  }, []);

  // Violations (Supabase)
  const loadViolations = useCallback(
    async (_limit = 100) => {
      if (!userId) {
        setViolations([]);
        return;
      }
      const { data, error } = await supabase
        .from('ppe_violations')
        .select('id, zone_id, camera_id, missing_items, acknowledged, metadata, created_at, ppe_zones!inner(name)')
        .order('created_at', { ascending: false })
        .limit(_limit);
      if (error) {
        toast.error('Falha ao carregar violações', { description: error.message });
        setViolations([]);
        return;
      }
      type Row = {
        id: string;
        zone_id: string;
        camera_id: string;
        missing_items: string[];
        acknowledged: boolean;
        metadata: { tracking_id?: string } | null;
        created_at: string;
        ppe_zones: { name: string } | { name: string }[] | null;
      };
      setViolations(
        (data ?? []).map((r) => {
          const row = r as unknown as Row;
          const meta = (row.metadata ?? {}) as { tracking_id?: string };
          const zn = Array.isArray(row.ppe_zones)
            ? row.ppe_zones[0]?.name
            : row.ppe_zones?.name;
          return {
            id: row.id,
            personId: meta.tracking_id ?? '',
            zoneId: row.zone_id,
            zoneName: zn ?? '',
            cameraId: row.camera_id,
            missingItems: (row.missing_items ?? []) as PPEType[],
            timestamp: new Date(row.created_at),
            acknowledged: row.acknowledged ?? false,
          };
        }),
      );
    },
    [userId],
  );
  const acknowledgeViolation = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('ppe_violations')
      .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast.error('Falha ao confirmar violação', { description: error.message });
      return;
    }
    setViolations((prev) => prev.map((v) => (v.id === id ? { ...v, acknowledged: true } : v)));
  }, []);

  // Recalcula stats.violationCount sempre que violations mudar
  useEffect(() => {
    setStats((prev) => ({
      ...prev,
      violationCount: violations.length,
      totalDetections: violations.length,
    }));
  }, [violations]);

  const updateConfig = useCallback((updates: Partial<PPEConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    loadZones();
    loadViolations();
  }, [loadZones, loadViolations]);
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    isDetecting,
    detections,
    zones,
    violations,
    stats,
    config,
    ppeTypes: PPE_TYPES,
    detectPPE,
    startContinuousDetection,
    stopContinuousDetection,
    loadZones,
    createZone,
    updateZone,
    deleteZone,
    loadViolations,
    acknowledgeViolation,
    updateConfig,
  };
}

export default usePPEDetection;
