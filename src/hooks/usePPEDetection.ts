/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: usePPEDetection (VERSÃO MELHORADA)
 * 
 * Detecção de EPIs usando:
 * 1. GPT-4 Vision (primário, via Edge Function) - Alta precisão
 * 2. COCO-SSD local (fallback) - Heurísticas baseadas em posição
 * 
 * EPIs suportados:
 * - Capacete (helmet)
 * - Colete (vest)
 * - Luvas (gloves)
 * - Botas (boots)
 * - Óculos (goggles)
 * - Máscara (mask)
 * - Protetor auricular (earmuffs)
 * - Cinto de segurança (harness)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMLModels, type DetectedObject } from './useMLModels';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

export type PPEType = 
  | 'helmet' 
  | 'vest' 
  | 'gloves' 
  | 'boots' 
  | 'goggles' 
  | 'mask' 
  | 'earmuffs' 
  | 'harness';

export type PPEStatus = 'detected' | 'missing' | 'unknown';

export interface PPEItem {
  type: PPEType;
  status: PPEStatus;
  confidence: number;
  detectionMethod: 'vision-ai' | 'local-ml' | 'heuristic';
}

export interface PersonPPEDetection {
  personId: string;
  trackingId: string;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  items: PPEItem[];
  isCompliant: boolean;
  missingItems: PPEType[];
  timestamp: Date;
  cameraId?: string;
  zoneId?: string;
}

export interface PPEZone {
  id: string;
  name: string;
  cameraId: string;
  requiredPPE: PPEType[];
  alertEnabled: boolean;
  gracePeriodSeconds: number;
  polygon?: { x: number; y: number }[];
  createdAt: Date;
}

export interface PPEViolation {
  id: string;
  personId: string;
  zoneId: string;
  zoneName: string;
  cameraId: string;
  missingItems: PPEType[];
  timestamp: Date;
  acknowledged: boolean;
  imageUrl?: string;
}

export interface PPEConfig {
  useVisionAI: boolean;
  confidenceThreshold: number;
  detectionInterval: number;
  saveViolations: boolean;
  alertOnViolation: boolean;
  gracePeriodMs: number;
}

export interface PPEStats {
  totalDetections: number;
  compliantCount: number;
  violationCount: number;
  complianceRate: number;
  byPPEType: Record<PPEType, { detected: number; missing: number }>;
}

// ============================================
// CONSTANTES
// ============================================

export const PPE_TYPES: { id: PPEType; label: string; icon: string }[] = [
  { id: 'helmet', label: 'Capacete', icon: '🪖' },
  { id: 'vest', label: 'Colete', icon: '🦺' },
  { id: 'gloves', label: 'Luvas', icon: '🧤' },
  { id: 'boots', label: 'Botas', icon: '👢' },
  { id: 'goggles', label: 'Óculos', icon: '🥽' },
  { id: 'mask', label: 'Máscara', icon: '😷' },
  { id: 'earmuffs', label: 'Protetor Auricular', icon: '🎧' },
  { id: 'harness', label: 'Cinto de Segurança', icon: '🪢' },
];

const DEFAULT_CONFIG: PPEConfig = {
  useVisionAI: true,
  confidenceThreshold: 0.6,
  detectionInterval: 2000,
  saveViolations: true,
  alertOnViolation: true,
  gracePeriodMs: 5000,
};

// ============================================
// HOOK
// ============================================

export interface UsePPEDetectionOptions {
  onViolation?: (violation: PPEViolation) => void;
  onCompliance?: (detection: PersonPPEDetection) => void;
  onError?: (error: Error) => void;
}

export function usePPEDetection(options: UsePPEDetectionOptions = {}) {
  const { onViolation, onCompliance, onError } = options;

  // Estado
  const [config, setConfig] = useState<PPEConfig>(DEFAULT_CONFIG);
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

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackingCache = useRef<Map<string, { lastSeen: number; trackingId: string }>>(new Map());

  // ML Models hook (para fallback local)
  const { detectObjects, detectPersons, isReady: mlReady } = useMLModels({
    models: ['coco-ssd'],
    autoLoad: true,
  });

  // ============================================
  // DETECÇÃO VIA VISION AI (GPT-4)
  // ============================================
  
  const detectWithVisionAI = useCallback(async (
    imageData: string,
    requiredPPE: PPEType[]
  ): Promise<PPEItem[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: {
          image: imageData,
          analysisType: 'ppe',
          prompt: `Analyze this image for Personal Protective Equipment (PPE).
For each of the following items, determine if it is:
- "detected": clearly visible and worn by the person
- "missing": not visible or not worn
- "unknown": cannot determine

Required PPE to check: ${requiredPPE.join(', ')}

Respond in JSON format:
{
  "items": [
    { "type": "helmet", "status": "detected", "confidence": 0.95 },
    { "type": "vest", "status": "missing", "confidence": 0.90 }
  ]
}`,
        },
      });

      if (error) throw error;

      // Parse resposta do GPT-4
      const response = data?.analysis || data;
      if (response?.items) {
        return response.items.map((item: unknown) => ({
          type: item.type as PPEType,
          status: item.status as PPEStatus,
          confidence: item.confidence || 0.8,
          detectionMethod: 'vision-ai' as const,
        }));
      }

      return [];
    } catch (err) {
      return [];
    }
  }, []);

  // ============================================
  // DETECÇÃO LOCAL (COCO-SSD + HEURÍSTICAS)
  // ============================================

  const detectWithLocalML = useCallback(async (
    video: HTMLVideoElement,
    personBox: { x: number; y: number; width: number; height: number },
    allObjects: DetectedObject[],
    requiredPPE: PPEType[]
  ): Promise<PPEItem[]> => {
    const items: PPEItem[] = [];
    const { x, y, width, height } = personBox;

    // Regiões corporais
    const regions = {
      head: { x, y, w: width, h: height * 0.2 },
      torso: { x, y: y + height * 0.2, w: width, h: height * 0.35 },
      hands: { x: x - width * 0.1, y: y + height * 0.4, w: width * 1.2, h: height * 0.25 },
      feet: { x, y: y + height * 0.85, w: width, h: height * 0.15 },
      face: { x: x + width * 0.2, y: y + height * 0.05, w: width * 0.6, h: height * 0.15 },
    };

    // Helper para verificar se objeto está na região
    const isInRegion = (obj: DetectedObject, region: typeof regions.head): boolean => {
      const [ox, oy, ow, oh] = obj.bbox;
      const centerX = ox + ow / 2;
      const centerY = oy + oh / 2;
      return (
        centerX >= region.x &&
        centerX <= region.x + region.w &&
        centerY >= region.y &&
        centerY <= region.y + region.h
      );
    };

    // Analisar cada EPI requerido
    for (const ppeType of requiredPPE) {
      let status: PPEStatus = 'unknown';
      let confidence = 0;

      switch (ppeType) {
        case 'helmet':
          // Procurar objetos na região da cabeça
          const headObjects = allObjects.filter(o => isInRegion(o, regions.head));
          // COCO-SSD não tem classe 'helmet', usamos heurística de posição
          if (headObjects.some(o => ['sports ball', 'bowl', 'frisbee', 'hat'].includes(o.class))) {
            status = 'detected';
            confidence = 0.6; // Baixa confiança por ser heurística
          } else if (headObjects.length === 0) {
            status = 'missing';
            confidence = 0.5;
          }
          break;

        case 'vest':
          const torsoObjects = allObjects.filter(o => isInRegion(o, regions.torso));
          // Verificar objetos no torso ou coloração (requer análise de cor)
          if (torsoObjects.some(o => ['backpack', 'handbag'].includes(o.class))) {
            status = 'detected';
            confidence = 0.5;
          } else {
            status = 'unknown'; // Não conseguimos detectar com COCO-SSD
            confidence = 0.3;
          }
          break;

        case 'goggles':
        case 'mask':
          const faceObjects = allObjects.filter(o => isInRegion(o, regions.face));
          if (faceObjects.some(o => ['cell phone', 'remote'].includes(o.class))) {
            status = 'detected';
            confidence = 0.4;
          } else {
            status = 'unknown';
            confidence = 0.3;
          }
          break;

        case 'gloves':
          const handObjects = allObjects.filter(o => isInRegion(o, regions.hands));
          // Gloves são muito difíceis de detectar com COCO-SSD
          status = 'unknown';
          confidence = 0.2;
          break;

        case 'boots':
          const feetObjects = allObjects.filter(o => isInRegion(o, regions.feet));
          // Boots são difíceis de distinguir de sapatos normais
          status = 'unknown';
          confidence = 0.2;
          break;

        default:
          status = 'unknown';
          confidence = 0.1;
      }

      items.push({
        type: ppeType,
        status,
        confidence,
        detectionMethod: status === 'unknown' ? 'heuristic' : 'local-ml',
      });
    }

    return items;
  }, []);

  // ============================================
  // DETECÇÃO PRINCIPAL
  // ============================================

  const detectPPE = useCallback(async (
    video: HTMLVideoElement,
    zoneConfig?: PPEZone
  ): Promise<PersonPPEDetection[]> => {
    if (!video || video.readyState < 2) return [];

    const results: PersonPPEDetection[] = [];
    const requiredPPE = zoneConfig?.requiredPPE || ['helmet', 'vest'];

    try {
      // Detectar pessoas
      const persons = await detectPersons(video);
      const allObjects = await detectObjects(video);

      if (persons.length === 0) return [];

      for (const person of persons) {
        const [x, y, width, height] = person.bbox;
        const personKey = `${Math.round(x/50)}-${Math.round(y/50)}`;
        
        // Tracking ID
        let trackingId: string;
        const cached = trackingCache.current.get(personKey);
        if (cached && Date.now() - cached.lastSeen < 2000) {
          trackingId = cached.trackingId;
        } else {
          trackingId = `ppe-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        }
        trackingCache.current.set(personKey, { lastSeen: Date.now(), trackingId });

        // Detectar EPIs
        let items: PPEItem[] = [];

        // Tentar Vision AI primeiro (se habilitado)
        if (config.useVisionAI) {
          // Capturar região da pessoa
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, x, y, width, height, 0, 0, width, height);
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            items = await detectWithVisionAI(imageData.split(',')[1], requiredPPE);
          }
        }

        // Fallback para ML local se Vision AI não retornou resultados
        if (items.length === 0 && mlReady) {
          items = await detectWithLocalML(video, { x, y, width, height }, allObjects, requiredPPE);
        }

        // Calcular conformidade
        const missingItems = items
          .filter(i => i.status === 'missing')
          .map(i => i.type);
        
        const isCompliant = missingItems.length === 0 && 
          items.filter(i => i.status === 'detected').length >= requiredPPE.length * 0.5;

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

        // Callbacks
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

          if (config.saveViolations) {
            await saveViolation(violation);
          }

          onViolation?.(violation);
          setViolations(prev => [violation, ...prev].slice(0, 100));
        }
      }

      // Atualizar detecções e stats
      setDetections(results);
      updateStats(results);

      return results;
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
      return [];
    }
  }, [config, mlReady, detectObjects, detectPersons, detectWithVisionAI, detectWithLocalML, onViolation, onCompliance, onError]);

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  const saveViolation = async (violation: PPEViolation) => {
    try {
      await supabase.from('ppe_violations').insert({
        person_id: violation.personId,
        zone_id: violation.zoneId,
        zone_name: violation.zoneName,
        camera_id: violation.cameraId,
        missing_items: violation.missingItems,
        image_url: violation.imageUrl,
      });
    } catch (err) {
    }
  };

  const updateStats = (results: PersonPPEDetection[]) => {
    setStats(prev => {
      const newStats = { ...prev };
      newStats.totalDetections += results.length;
      newStats.compliantCount += results.filter(r => r.isCompliant).length;
      newStats.violationCount += results.filter(r => !r.isCompliant && r.missingItems.length > 0).length;
      newStats.complianceRate = newStats.totalDetections > 0
        ? (newStats.compliantCount / newStats.totalDetections) * 100
        : 100;
      return newStats;
    });
  };

  // ============================================
  // DETECÇÃO CONTÍNUA
  // ============================================

  const startContinuousDetection = useCallback((
    video: HTMLVideoElement,
    zoneConfig?: PPEZone
  ) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsDetecting(true);

    intervalRef.current = setInterval(() => {
      detectPPE(video, zoneConfig);
    }, config.detectionInterval);

    // Detecção inicial
    detectPPE(video, zoneConfig);
  }, [detectPPE, config.detectionInterval]);

  const stopContinuousDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsDetecting(false);
  }, []);

  // ============================================
  // CRUD DE ZONAS
  // ============================================

  const loadZones = useCallback(async () => {
    const { data, error } = await supabase
      .from('ppe_zones')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setZones(data.map(z => ({
        id: z.id,
        name: z.name,
        cameraId: z.camera_id,
        requiredPPE: z.required_ppe as PPEType[],
        alertEnabled: z.alert_enabled,
        gracePeriodSeconds: z.grace_period_seconds,
        polygon: z.polygon,
        createdAt: new Date(z.created_at),
      })));
    }
  }, []);

  const createZone = useCallback(async (zone: Omit<PPEZone, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase
      .from('ppe_zones')
      .insert({
        name: zone.name,
        camera_id: zone.cameraId,
        required_ppe: zone.requiredPPE,
        alert_enabled: zone.alertEnabled,
        grace_period_seconds: zone.gracePeriodSeconds,
        polygon: zone.polygon,
      })
      .select()
      .single();

    if (!error && data) {
      await loadZones();
      toast.success('Zona PPE criada');
      return data.id;
    }
    return null;
  }, [loadZones]);

  const updateZone = useCallback(async (id: string, updates: Partial<PPEZone>) => {
    const { error } = await supabase
      .from('ppe_zones')
      .update({
        name: updates.name,
        required_ppe: updates.requiredPPE,
        alert_enabled: updates.alertEnabled,
        grace_period_seconds: updates.gracePeriodSeconds,
        polygon: updates.polygon,
      })
      .eq('id', id);

    if (!error) {
      await loadZones();
      toast.success('Zona atualizada');
    }
  }, [loadZones]);

  const deleteZone = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('ppe_zones')
      .delete()
      .eq('id', id);

    if (!error) {
      await loadZones();
      toast.success('Zona removida');
    }
  }, [loadZones]);

  // ============================================
  // VIOLAÇÕES
  // ============================================

  const loadViolations = useCallback(async (limit = 50) => {
    const { data, error } = await supabase
      .from('ppe_violations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data) {
      setViolations(data.map(v => ({
        id: v.id,
        personId: v.person_id,
        zoneId: v.zone_id,
        zoneName: v.zone_name,
        cameraId: v.camera_id,
        missingItems: v.missing_items as PPEType[],
        timestamp: new Date(v.created_at),
        acknowledged: v.acknowledged,
        imageUrl: v.image_url,
      })));
    }
  }, []);

  const acknowledgeViolation = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('ppe_violations')
      .update({ acknowledged: true })
      .eq('id', id);

    if (!error) {
      setViolations(prev => prev.map(v => 
        v.id === id ? { ...v, acknowledged: true } : v
      ));
    }
  }, []);

  // ============================================
  // CONFIGURAÇÃO
  // ============================================

  const updateConfig = useCallback((updates: Partial<PPEConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // ============================================
  // EFEITOS
  // ============================================

  useEffect(() => {
    loadZones();
    loadViolations();
  }, [loadZones, loadViolations]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // ============================================
  // RETORNO
  // ============================================

  return {
    // Estado
    isDetecting,
    detections,
    zones,
    violations,
    stats,
    config,
    ppeTypes: PPE_TYPES,
    
    // Detecção
    detectPPE,
    startContinuousDetection,
    stopContinuousDetection,
    
    // Zonas
    loadZones,
    createZone,
    updateZone,
    deleteZone,
    
    // Violações
    loadViolations,
    acknowledgeViolation,
    
    // Config
    updateConfig,
  };
}

export default usePPEDetection;
