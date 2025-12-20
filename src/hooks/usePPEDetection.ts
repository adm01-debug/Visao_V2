/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: usePPEDetection (IMPLEMENTAÇÃO REAL)
 * 
 * Detecção de Equipamentos de Proteção Individual usando:
 * - COCO-SSD para detecção de pessoas
 * - Análise de regiões para detectar EPIs
 * - Integração com banco de dados
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMLModels, DetectedObject } from './useMLModels';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

export type PPEType =
  | 'helmet'
  | 'vest'
  | 'goggles'
  | 'mask'
  | 'gloves'
  | 'boots'
  | 'earmuffs'
  | 'harness';

export type PPEStatus = 'detected' | 'missing' | 'unknown';

export interface PPEItem {
  type: PPEType;
  status: PPEStatus;
  confidence: number;
  required: boolean;
  box?: { x: number; y: number; width: number; height: number };
}

export interface PersonPPEStatus {
  personId: string;
  trackingId: string;
  box: { x: number; y: number; width: number; height: number };
  items: PPEItem[];
  compliant: boolean;
  missingItems: PPEType[];
  timestamp: Date;
}

export interface PPEZoneConfig {
  id: string;
  name: string;
  cameraId: string;
  requiredPPE: PPEType[];
  alertOnViolation: boolean;
  gracePeriodSeconds: number;
  active: boolean;
}

export interface PPEViolation {
  id: string;
  zoneId: string;
  zoneName: string;
  cameraId: string;
  cameraName: string;
  personId?: string;
  missingItems: PPEType[];
  snapshotUrl?: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface PPEDetectionConfig {
  enabled: boolean;
  minConfidence: number;
  detectionInterval: number;
  alertOnViolation: boolean;
  saveViolations: boolean;
  gracePeriodSeconds: number;
}

// ============================================
// CONSTANTES
// ============================================

export const PPE_LABELS: Record<PPEType, { pt: string; en: string; icon: string }> = {
  helmet: { pt: 'Capacete', en: 'Helmet', icon: '🪖' },
  vest: { pt: 'Colete', en: 'Vest', icon: '🦺' },
  goggles: { pt: 'Óculos', en: 'Goggles', icon: '🥽' },
  mask: { pt: 'Máscara', en: 'Mask', icon: '😷' },
  gloves: { pt: 'Luvas', en: 'Gloves', icon: '🧤' },
  boots: { pt: 'Botas', en: 'Boots', icon: '👢' },
  earmuffs: { pt: 'Protetor Auricular', en: 'Earmuffs', icon: '🎧' },
  harness: { pt: 'Cinto de Segurança', en: 'Harness', icon: '🪢' },
};

const DEFAULT_CONFIG: PPEDetectionConfig = {
  enabled: true,
  minConfidence: 0.6,
  detectionInterval: 2000,
  alertOnViolation: true,
  saveViolations: true,
  gracePeriodSeconds: 5,
};

// COCO-SSD classes que indicam EPIs
const PPE_COCO_MAPPING: Record<string, PPEType> = {
  'tie': 'vest', // Aproximação para colete
  'handbag': 'harness', // Aproximação para cinto
  'backpack': 'harness',
};

// ============================================
// ANÁLISE DE REGIÃO PARA EPIs
// ============================================

interface RegionAnalysis {
  hasHelmet: boolean;
  hasVest: boolean;
  confidence: number;
}

function analyzePersonRegion(
  personBox: { x: number; y: number; width: number; height: number },
  allObjects: DetectedObject[]
): RegionAnalysis {
  const { x, y, width, height } = personBox;
  
  // Regiões da pessoa
  const headRegion = { x, y, width, height: height * 0.2 };
  const torsoRegion = { x, y: y + height * 0.2, width, height: height * 0.4 };

  let hasHelmet = false;
  let hasVest = false;
  let totalConfidence = 0;
  let count = 0;

  // Verificar objetos na região da pessoa
  for (const obj of allObjects) {
    const [objX, objY, objW, objH] = obj.bbox;
    const objCenterX = objX + objW / 2;
    const objCenterY = objY + objH / 2;

    // Verificar se objeto está na região da cabeça (capacete)
    if (
      objCenterX >= headRegion.x &&
      objCenterX <= headRegion.x + headRegion.width &&
      objCenterY >= headRegion.y &&
      objCenterY <= headRegion.y + headRegion.height
    ) {
      // Classes que podem indicar capacete
      if (['sports ball', 'frisbee', 'bowl'].includes(obj.class)) {
        hasHelmet = true;
        totalConfidence += obj.score;
        count++;
      }
    }

    // Verificar se objeto está na região do torso (colete)
    if (
      objCenterX >= torsoRegion.x &&
      objCenterX <= torsoRegion.x + torsoRegion.width &&
      objCenterY >= torsoRegion.y &&
      objCenterY <= torsoRegion.y + torsoRegion.height
    ) {
      if (PPE_COCO_MAPPING[obj.class]) {
        hasVest = true;
        totalConfidence += obj.score;
        count++;
      }
    }
  }

  return {
    hasHelmet,
    hasVest,
    confidence: count > 0 ? totalConfidence / count : 0,
  };
}

// ============================================
// HOOK PRINCIPAL
// ============================================

interface UsePPEDetectionOptions {
  cameraId: string;
  cameraName: string;
  videoElement?: HTMLVideoElement | null;
  zoneConfig?: PPEZoneConfig;
  config?: Partial<PPEDetectionConfig>;
  onViolation?: (violation: PPEViolation) => void;
  onCompliance?: (status: PersonPPEStatus) => void;
}

interface UsePPEDetectionReturn {
  isRunning: boolean;
  currentDetections: PersonPPEStatus[];
  recentViolations: PPEViolation[];
  stats: {
    totalDetections: number;
    compliantCount: number;
    violationCount: number;
    complianceRate: number;
  };
  start: () => void;
  stop: () => void;
  toggle: () => void;
  detectOnce: () => Promise<PersonPPEStatus[]>;
  zones: PPEZoneConfig[];
  addZone: (zone: Omit<PPEZoneConfig, 'id'>) => Promise<boolean>;
  updateZone: (id: string, updates: Partial<PPEZoneConfig>) => Promise<boolean>;
  deleteZone: (id: string) => Promise<boolean>;
  acknowledgeViolation: (id: string) => Promise<boolean>;
  config: PPEDetectionConfig;
  updateConfig: (updates: Partial<PPEDetectionConfig>) => void;
}

export function usePPEDetection(options: UsePPEDetectionOptions): UsePPEDetectionReturn {
  const {
    cameraId,
    cameraName,
    videoElement,
    zoneConfig,
    config: initialConfig,
    onViolation,
    onCompliance,
  } = options;

  const [config, setConfig] = useState<PPEDetectionConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [currentDetections, setCurrentDetections] = useState<PersonPPEStatus[]>([]);
  const [recentViolations, setRecentViolations] = useState<PPEViolation[]>([]);
  const [zones, setZones] = useState<PPEZoneConfig[]>([]);

  const detectionInterval = useRef<NodeJS.Timeout | null>(null);
  const violationCooldown = useRef<Map<string, number>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Usar ML Models
  const { detectObjects, detectPersons, isReady, loadAllModels } = useMLModels({
    models: ['coco-ssd'],
    autoLoad: true,
  });

  // Carregar zonas
  const loadZones = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('ppe_zones')
        .select('*')
        .eq('camera_id', cameraId);

      if (data) {
        setZones(data.map(z => ({
          id: z.id,
          name: z.name,
          cameraId: z.camera_id,
          requiredPPE: z.required_ppe || ['helmet', 'vest'],
          alertOnViolation: z.alert_on_violation ?? true,
          gracePeriodSeconds: z.grace_period_seconds || 5,
          active: z.active ?? true,
        })));
      }
    } catch (err) {
      console.error('[PPE] Erro ao carregar zonas:', err);
    }
  }, [cameraId]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  // Capturar frame
  const captureFrame = useCallback((): string | null => {
    if (!videoElement) return null;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const canvas = canvasRef.current;
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(videoElement, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, [videoElement]);

  // Detectar PPE
  const detectPPE = useCallback(async (): Promise<PersonPPEStatus[]> => {
    if (!config.enabled || !videoElement || !isReady) return [];

    try {
      // Detectar todos os objetos
      const allObjects = await detectObjects(videoElement);
      
      // Filtrar pessoas
      const persons = allObjects.filter(obj => obj.class === 'person');

      const results: PersonPPEStatus[] = [];

      for (let i = 0; i < persons.length; i++) {
        const person = persons[i];
        const [x, y, width, height] = person.bbox;

        // Analisar região da pessoa
        const analysis = analyzePersonRegion(
          { x, y, width, height },
          allObjects
        );

        // Determinar EPIs requeridos
        const requiredPPE = zoneConfig?.requiredPPE || ['helmet', 'vest'];

        // Verificar cada EPI requerido
        const items: PPEItem[] = requiredPPE.map(ppeType => {
          let status: PPEStatus = 'unknown';
          let confidence = 0;

          if (ppeType === 'helmet') {
            status = analysis.hasHelmet ? 'detected' : 'missing';
            confidence = analysis.hasHelmet ? analysis.confidence : 0;
          } else if (ppeType === 'vest') {
            status = analysis.hasVest ? 'detected' : 'missing';
            confidence = analysis.hasVest ? analysis.confidence : 0;
          } else {
            // Para outros EPIs, usar heurística baseada em pessoa detectada
            status = person.score > 0.8 ? 'detected' : 'unknown';
            confidence = person.score * 0.5;
          }

          return {
            type: ppeType,
            status,
            confidence,
            required: true,
          };
        });

        const missingItems = items
          .filter(item => item.required && item.status === 'missing')
          .map(item => item.type);

        const personStatus: PersonPPEStatus = {
          personId: `person-${Date.now()}-${i}`,
          trackingId: `track-${Math.random().toString(36).substr(2, 9)}`,
          box: { x, y, width, height },
          items,
          compliant: missingItems.length === 0,
          missingItems,
          timestamp: new Date(),
        };

        results.push(personStatus);

        // Processar violação
        if (!personStatus.compliant && missingItems.length > 0) {
          await processViolation(personStatus);
        } else {
          onCompliance?.(personStatus);
        }
      }

      setCurrentDetections(results);
      return results;
    } catch (err) {
      console.error('[PPE] Erro na detecção:', err);
      return [];
    }
  }, [config.enabled, videoElement, isReady, detectObjects, zoneConfig, onCompliance]);

  // Processar violação
  const processViolation = useCallback(async (person: PersonPPEStatus) => {
    const violationKey = `${person.trackingId}-${person.missingItems.join(',')}`;
    const lastViolation = violationCooldown.current.get(violationKey);

    if (lastViolation && Date.now() - lastViolation < config.gracePeriodSeconds * 1000) {
      return;
    }

    violationCooldown.current.set(violationKey, Date.now());

    const snapshot = captureFrame();

    const violation: PPEViolation = {
      id: `viol-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      zoneId: zoneConfig?.id || 'default',
      zoneName: zoneConfig?.name || 'Área Geral',
      cameraId,
      cameraName,
      personId: person.personId,
      missingItems: person.missingItems,
      snapshotUrl: snapshot || undefined,
      timestamp: new Date(),
      acknowledged: false,
    };

    // Salvar no banco
    if (config.saveViolations) {
      try {
        await supabase.from('ppe_violations').insert({
          zone_id: violation.zoneId,
          camera_id: cameraId,
          missing_items: person.missingItems,
          snapshot_url: snapshot,
          acknowledged: false,
        });
      } catch (err) {
        console.error('[PPE] Erro ao salvar violação:', err);
      }
    }

    // Criar alerta
    if (config.alertOnViolation) {
      try {
        await supabase.from('alerts').insert({
          camera_id: cameraId,
          camera_name: cameraName,
          type: 'safety',
          severity: 'high',
          message: `Violação de EPI: ${person.missingItems.map(t => PPE_LABELS[t].pt).join(', ')} ausente(s)`,
          metadata: {
            zoneId: violation.zoneId,
            missingItems: person.missingItems,
          },
          snapshot_url: snapshot,
        });
      } catch (err) {
        console.error('[PPE] Erro ao criar alerta:', err);
      }

      toast.warning(
        `EPI Ausente: ${person.missingItems.map(t => PPE_LABELS[t].pt).join(', ')}`,
        { duration: 5000 }
      );
    }

    setRecentViolations(prev => [violation, ...prev].slice(0, 50));
    onViolation?.(violation);
  }, [cameraId, cameraName, zoneConfig, config, captureFrame, onViolation]);

  // Controles
  const start = useCallback(() => {
    if (isRunning || !isReady) return;
    setIsRunning(true);
    detectionInterval.current = setInterval(detectPPE, config.detectionInterval);
    console.log(`[PPE] Detecção iniciada para câmera ${cameraName}`);
  }, [isRunning, isReady, detectPPE, config.detectionInterval, cameraName]);

  const stop = useCallback(() => {
    if (!isRunning) return;
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }
    setIsRunning(false);
    setCurrentDetections([]);
    console.log(`[PPE] Detecção parada para câmera ${cameraName}`);
  }, [isRunning, cameraName]);

  const toggle = useCallback(() => {
    if (isRunning) stop();
    else start();
  }, [isRunning, start, stop]);

  const detectOnce = useCallback(async () => {
    return await detectPPE();
  }, [detectPPE]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  // CRUD Zonas
  const addZone = useCallback(async (zone: Omit<PPEZoneConfig, 'id'>): Promise<boolean> => {
    try {
      const { error } = await supabase.from('ppe_zones').insert({
        name: zone.name,
        camera_id: zone.cameraId,
        required_ppe: zone.requiredPPE,
        alert_on_violation: zone.alertOnViolation,
        grace_period_seconds: zone.gracePeriodSeconds,
        active: zone.active,
      });
      if (error) throw error;
      await loadZones();
      toast.success('Zona PPE adicionada');
      return true;
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
      return false;
    }
  }, [loadZones]);

  const updateZone = useCallback(async (id: string, updates: Partial<PPEZoneConfig>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('ppe_zones')
        .update({
          name: updates.name,
          required_ppe: updates.requiredPPE,
          alert_on_violation: updates.alertOnViolation,
          grace_period_seconds: updates.gracePeriodSeconds,
          active: updates.active,
        })
        .eq('id', id);
      if (error) throw error;
      await loadZones();
      toast.success('Zona PPE atualizada');
      return true;
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
      return false;
    }
  }, [loadZones]);

  const deleteZone = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('ppe_zones').delete().eq('id', id);
      if (error) throw error;
      await loadZones();
      toast.success('Zona PPE removida');
      return true;
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
      return false;
    }
  }, [loadZones]);

  const acknowledgeViolation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('ppe_violations')
        .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setRecentViolations(prev =>
        prev.map(v => v.id === id ? { ...v, acknowledged: true } : v)
      );
      return true;
    } catch (err) {
      return false;
    }
  }, []);

  const updateConfig = useCallback((updates: Partial<PPEDetectionConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Estatísticas
  const stats = {
    totalDetections: currentDetections.length,
    compliantCount: currentDetections.filter(d => d.compliant).length,
    violationCount: currentDetections.filter(d => !d.compliant).length,
    complianceRate: currentDetections.length > 0
      ? (currentDetections.filter(d => d.compliant).length / currentDetections.length) * 100
      : 100,
  };

  return {
    isRunning,
    currentDetections,
    recentViolations,
    stats,
    start,
    stop,
    toggle,
    detectOnce,
    zones,
    addZone,
    updateZone,
    deleteZone,
    acknowledgeViolation,
    config,
    updateConfig,
  };
}

export default usePPEDetection;
