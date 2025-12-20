/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: usePPEDetection
 * 
 * Detecção de Equipamentos de Proteção Individual (EPI/PPE):
 * - Capacete de segurança
 * - Colete reflexivo
 * - Óculos de proteção
 * - Máscara facial
 * - Luvas
 * - Botas de segurança
 * - Protetor auricular
 * 
 * Usa modelos de ML para análise de frames de vídeo
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

export type PPEType = 
  | 'helmet'      // Capacete
  | 'vest'        // Colete
  | 'goggles'     // Óculos
  | 'mask'        // Máscara
  | 'gloves'      // Luvas
  | 'boots'       // Botas
  | 'earmuffs'    // Protetor auricular
  | 'harness';    // Cinto de segurança

export type PPEStatus = 'detected' | 'missing' | 'unknown';

export interface PPEItem {
  type: PPEType;
  status: PPEStatus;
  confidence: number;
  required: boolean;
  box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PersonPPEStatus {
  personId: string;
  trackingId: string;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
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
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface PPEStats {
  totalDetections: number;
  compliantCount: number;
  violationCount: number;
  complianceRate: number;
  mostMissingItem: PPEType | null;
  detectionsByType: Record<PPEType, number>;
}

export interface PPEDetectionConfig {
  enabled: boolean;
  minConfidence: number;
  detectionInterval: number;
  modelEndpoint: string;
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
  modelEndpoint: '/api/ppe-detection',
  alertOnViolation: true,
  saveViolations: true,
  gracePeriodSeconds: 5,
};

// ============================================
// MOCK DETECTION (Simula resposta do modelo ML)
// ============================================

function mockPPEDetection(imageData: string): Promise<PersonPPEStatus[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simular detecção de 1-3 pessoas
      const numPeople = Math.floor(Math.random() * 3) + 1;
      const results: PersonPPEStatus[] = [];

      for (let i = 0; i < numPeople; i++) {
        const items: PPEItem[] = [
          {
            type: 'helmet',
            status: Math.random() > 0.3 ? 'detected' : 'missing',
            confidence: 0.7 + Math.random() * 0.25,
            required: true,
          },
          {
            type: 'vest',
            status: Math.random() > 0.2 ? 'detected' : 'missing',
            confidence: 0.75 + Math.random() * 0.2,
            required: true,
          },
          {
            type: 'goggles',
            status: Math.random() > 0.4 ? 'detected' : 'missing',
            confidence: 0.65 + Math.random() * 0.3,
            required: false,
          },
          {
            type: 'gloves',
            status: Math.random() > 0.35 ? 'detected' : 'missing',
            confidence: 0.6 + Math.random() * 0.35,
            required: true,
          },
          {
            type: 'boots',
            status: Math.random() > 0.25 ? 'detected' : 'missing',
            confidence: 0.7 + Math.random() * 0.25,
            required: true,
          },
        ];

        const missingItems = items
          .filter(item => item.required && item.status === 'missing')
          .map(item => item.type);

        results.push({
          personId: `person-${Date.now()}-${i}`,
          trackingId: `track-${Math.random().toString(36).substr(2, 9)}`,
          box: {
            x: 50 + i * 200 + Math.random() * 50,
            y: 100 + Math.random() * 50,
            width: 150 + Math.random() * 50,
            height: 300 + Math.random() * 100,
          },
          items,
          compliant: missingItems.length === 0,
          missingItems,
          timestamp: new Date(),
        });
      }

      resolve(results);
    }, 100);
  });
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
  stats: PPEStats;
  
  // Controles
  start: () => void;
  stop: () => void;
  toggle: () => void;
  detectOnce: () => Promise<PersonPPEStatus[]>;
  
  // Zonas
  zones: PPEZoneConfig[];
  addZone: (zone: Omit<PPEZoneConfig, 'id'>) => Promise<boolean>;
  updateZone: (id: string, updates: Partial<PPEZoneConfig>) => Promise<boolean>;
  deleteZone: (id: string) => Promise<boolean>;
  
  // Violações
  acknowledgeViolation: (id: string) => Promise<boolean>;
  exportViolations: (dateRange?: { from: Date; to: Date }) => Promise<string>;
  
  // Config
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
          requiredPPE: z.required_ppe || [],
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

  // Capturar frame do vídeo
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
    if (!config.enabled) return [];

    const imageData = captureFrame();
    if (!imageData) return [];

    try {
      // Em produção, fazer chamada real ao modelo
      // const response = await fetch(config.modelEndpoint, {
      //   method: 'POST',
      //   body: JSON.stringify({ image: imageData }),
      // });
      // const results = await response.json();

      // Por enquanto, usar mock
      const results = await mockPPEDetection(imageData);

      // Filtrar por confiança mínima
      const filtered = results.map(person => ({
        ...person,
        items: person.items.filter(item => item.confidence >= config.minConfidence),
      }));

      setCurrentDetections(filtered);

      // Processar violações
      for (const person of filtered) {
        if (!person.compliant && person.missingItems.length > 0) {
          await processViolation(person, imageData);
        } else {
          onCompliance?.(person);
        }
      }

      return filtered;
    } catch (err) {
      console.error('[PPE] Erro na detecção:', err);
      return [];
    }
  }, [config, captureFrame, onCompliance]);

  // Processar violação
  const processViolation = useCallback(async (
    person: PersonPPEStatus,
    imageData: string
  ) => {
    const violationKey = `${person.trackingId}-${person.missingItems.join(',')}`;
    const lastViolation = violationCooldown.current.get(violationKey);

    // Verificar grace period
    if (lastViolation && Date.now() - lastViolation < config.gracePeriodSeconds * 1000) {
      return;
    }

    violationCooldown.current.set(violationKey, Date.now());

    const violation: PPEViolation = {
      id: `viol-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      zoneId: zoneConfig?.id || 'default',
      zoneName: zoneConfig?.name || 'Área Geral',
      cameraId,
      cameraName,
      personId: person.personId,
      missingItems: person.missingItems,
      snapshotUrl: imageData,
      timestamp: new Date(),
      acknowledged: false,
    };

    // Salvar no banco
    if (config.saveViolations) {
      try {
        await supabase.from('ppe_violations').insert({
          zone_id: violation.zoneId,
          camera_id: cameraId,
          person_id: person.personId,
          missing_items: person.missingItems,
          snapshot_url: imageData,
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
          type: 'ppe_violation',
          severity: 'high',
          message: `Violação de EPI: ${person.missingItems.map(t => PPE_LABELS[t].pt).join(', ')} ausente(s)`,
          metadata: {
            zoneId: violation.zoneId,
            zoneName: violation.zoneName,
            missingItems: person.missingItems,
            personId: person.personId,
          },
          snapshot_url: imageData,
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
  }, [cameraId, cameraName, zoneConfig, config, onViolation]);

  // Iniciar detecção
  const start = useCallback(() => {
    if (isRunning) return;

    setIsRunning(true);
    detectionInterval.current = setInterval(detectPPE, config.detectionInterval);
    console.log(`[PPE] Detecção iniciada para câmera ${cameraName}`);
  }, [isRunning, detectPPE, config.detectionInterval, cameraName]);

  // Parar detecção
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

  // Toggle
  const toggle = useCallback(() => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  }, [isRunning, start, stop]);

  // Detectar uma vez
  const detectOnce = useCallback(async () => {
    return await detectPPE();
  }, [detectPPE]);

  // Cleanup
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Adicionar zona
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

  // Atualizar zona
  const updateZone = useCallback(async (
    id: string, 
    updates: Partial<PPEZoneConfig>
  ): Promise<boolean> => {
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

  // Deletar zona
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

  // Reconhecer violação
  const acknowledgeViolation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('ppe_violations')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setRecentViolations(prev =>
        prev.map(v => v.id === id ? { ...v, acknowledged: true, acknowledgedAt: new Date() } : v)
      );

      return true;
    } catch (err) {
      return false;
    }
  }, []);

  // Exportar violações
  const exportViolations = useCallback(async (
    dateRange?: { from: Date; to: Date }
  ): Promise<string> => {
    try {
      let query = supabase
        .from('ppe_violations')
        .select('*')
        .eq('camera_id', cameraId)
        .order('created_at', { ascending: false });

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      const { data } = await query;

      if (!data) return '';

      const headers = ['Data', 'Zona', 'Itens Faltantes', 'Reconhecido'];
      const rows = data.map(v => [
        new Date(v.created_at).toLocaleString('pt-BR'),
        v.zone_id,
        (v.missing_items || []).join(', '),
        v.acknowledged ? 'Sim' : 'Não',
      ]);

      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    } catch (err) {
      return '';
    }
  }, [cameraId]);

  // Atualizar config
  const updateConfig = useCallback((updates: Partial<PPEDetectionConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Calcular estatísticas
  const stats: PPEStats = {
    totalDetections: currentDetections.length,
    compliantCount: currentDetections.filter(d => d.compliant).length,
    violationCount: currentDetections.filter(d => !d.compliant).length,
    complianceRate: currentDetections.length > 0
      ? (currentDetections.filter(d => d.compliant).length / currentDetections.length) * 100
      : 100,
    mostMissingItem: (() => {
      const counts: Record<string, number> = {};
      currentDetections.forEach(d => {
        d.missingItems.forEach(item => {
          counts[item] = (counts[item] || 0) + 1;
        });
      });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return sorted[0]?.[0] as PPEType || null;
    })(),
    detectionsByType: (() => {
      const counts = {} as Record<PPEType, number>;
      Object.keys(PPE_LABELS).forEach(type => {
        counts[type as PPEType] = currentDetections.reduce((sum, d) => {
          const item = d.items.find(i => i.type === type && i.status === 'detected');
          return sum + (item ? 1 : 0);
        }, 0);
      });
      return counts;
    })(),
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
    exportViolations,
    config,
    updateConfig,
  };
}

export default usePPEDetection;
