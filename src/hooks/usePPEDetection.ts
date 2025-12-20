/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: usePPEDetection
 * 
 * Detecção de Equipamentos de Proteção Individual (versão simplificada/simulada)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
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
  box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PersonPPEStatus {
  id: string;
  personBox: {
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

export interface PPEViolation {
  id: string;
  cameraId: string;
  cameraName: string;
  zoneId?: string;
  zoneName?: string;
  personId: string;
  missingItems: PPEType[];
  snapshotUrl?: string;
  timestamp: Date;
  alertCreated: boolean;
  acknowledged: boolean;
}

export interface PPEZone {
  id: string;
  name: string;
  cameraId: string;
  requiredPPE: PPEType[];
  alertOnViolation: boolean;
  gracePeriodSeconds: number;
  active: boolean;
}

export interface PPEStats {
  totalChecks: number;
  compliantCount: number;
  violationCount: number;
  complianceRate: number;
  mostMissingItem: PPEType | null;
  averageDetectionTime: number;
}

// ============================================
// CONFIGURAÇÃO
// ============================================

export interface PPEConfig {
  minConfidence: number;
  checkInterval: number;
  gracePeriod: number;
  alertOnViolation: boolean;
  logAllChecks: boolean;
}

const DEFAULT_CONFIG: PPEConfig = {
  minConfidence: 0.6,
  checkInterval: 2000,
  gracePeriod: 5,
  alertOnViolation: true,
  logAllChecks: false,
};

const PPE_LABELS: Record<PPEType, string> = {
  helmet: 'Capacete',
  vest: 'Colete',
  goggles: 'Óculos',
  mask: 'Máscara',
  gloves: 'Luvas',
  boots: 'Botas',
  earmuffs: 'Protetor Auricular',
  harness: 'Cinto de Segurança',
};

// ============================================
// HOOK PRINCIPAL (SIMULAÇÃO)
// ============================================

interface UsePPEDetectionOptions {
  cameraId: string;
  cameraName: string;
  enabled?: boolean;
  requiredPPE?: PPEType[];
  config?: Partial<PPEConfig>;
  onViolation?: (violation: PPEViolation) => void;
  onCompliance?: (person: PersonPPEStatus) => void;
}

interface UsePPEDetectionReturn {
  isDetecting: boolean;
  zones: PPEZone[];
  violations: PPEViolation[];
  currentStatuses: PersonPPEStatus[];
  stats: PPEStats;
  config: PPEConfig;
  detectPPE: (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<PersonPPEStatus[]>;
  startDetection: (videoElement: HTMLVideoElement) => void;
  stopDetection: () => void;
  acknowledgeViolation: (violationId: string) => void;
  clearViolations: () => void;
  addZone: (zone: Omit<PPEZone, 'id'>) => void;
  removeZone: (zoneId: string) => void;
  updateConfig: (updates: Partial<PPEConfig>) => void;
  getPPELabel: (type: PPEType) => string;
}

export function usePPEDetection(options: UsePPEDetectionOptions): UsePPEDetectionReturn {
  const {
    cameraId,
    cameraName,
    enabled = false,
    requiredPPE = ['helmet', 'vest'],
    config: initialConfig,
    onViolation,
    onCompliance,
  } = options;

  const [config, setConfig] = useState<PPEConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  const [isDetecting, setIsDetecting] = useState(false);
  const [zones, setZones] = useState<PPEZone[]>([]);
  const [violations, setViolations] = useState<PPEViolation[]>([]);
  const [currentStatuses, setCurrentStatuses] = useState<PersonPPEStatus[]>([]);

  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checksRef = useRef<number>(0);
  const compliantRef = useRef<number>(0);

  // Estatísticas
  const stats: PPEStats = {
    totalChecks: checksRef.current,
    compliantCount: compliantRef.current,
    violationCount: violations.length,
    complianceRate: checksRef.current > 0 
      ? (compliantRef.current / checksRef.current) * 100 
      : 100,
    mostMissingItem: null,
    averageDetectionTime: 50,
  };

  // Detecção simulada
  const detectPPE = useCallback(async (
    _input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<PersonPPEStatus[]> => {
    checksRef.current += 1;

    const statuses: PersonPPEStatus[] = [];

    // 50% de chance de detectar uma pessoa
    if (Math.random() > 0.5) {
      const items: PPEItem[] = requiredPPE.map(type => {
        const isDetected = Math.random() > 0.2; // 80% de chance de ter o EPI
        return {
          type,
          status: isDetected ? 'detected' : 'missing',
          confidence: 0.7 + Math.random() * 0.25,
          required: true,
        };
      });

      const missingItems = items
        .filter(i => i.status === 'missing')
        .map(i => i.type);

      const compliant = missingItems.length === 0;

      const status: PersonPPEStatus = {
        id: `person-${Date.now()}`,
        personBox: {
          x: 100 + Math.random() * 200,
          y: 50 + Math.random() * 100,
          width: 100,
          height: 200,
        },
        items,
        compliant,
        missingItems,
        timestamp: new Date(),
      };

      statuses.push(status);

      if (compliant) {
        compliantRef.current += 1;
        onCompliance?.(status);
      } else {
        // Criar violação
        const violation: PPEViolation = {
          id: `viol-${Date.now()}`,
          cameraId,
          cameraName,
          personId: status.id,
          missingItems,
          timestamp: new Date(),
          alertCreated: config.alertOnViolation,
          acknowledged: false,
        };

        setViolations(prev => [violation, ...prev].slice(0, 50));
        onViolation?.(violation);

        if (config.alertOnViolation) {
          const missingLabels = missingItems.map(t => PPE_LABELS[t]).join(', ');
          toast.warning(`⚠️ EPI faltando: ${missingLabels}`);
        }
      }
    }

    setCurrentStatuses(statuses);
    return statuses;
  }, [cameraId, cameraName, requiredPPE, config.alertOnViolation, onViolation, onCompliance]);

  // Iniciar detecção contínua
  const startDetection = useCallback((videoElement: HTMLVideoElement) => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    setIsDetecting(true);

    detectionIntervalRef.current = setInterval(() => {
      detectPPE(videoElement);
    }, config.checkInterval);
  }, [config.checkInterval, detectPPE]);

  // Parar detecção
  const stopDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setIsDetecting(false);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  // Reconhecer violação
  const acknowledgeViolation = useCallback((violationId: string) => {
    setViolations(prev =>
      prev.map(v => v.id === violationId ? { ...v, acknowledged: true } : v)
    );
  }, []);

  // Limpar violações
  const clearViolations = useCallback(() => {
    setViolations([]);
  }, []);

  // Adicionar zona
  const addZone = useCallback((zone: Omit<PPEZone, 'id'>) => {
    const newZone: PPEZone = {
      ...zone,
      id: `zone-${Date.now()}`,
    };
    setZones(prev => [...prev, newZone]);
    toast.success(`Zona "${zone.name}" criada`);
  }, []);

  // Remover zona
  const removeZone = useCallback((zoneId: string) => {
    setZones(prev => prev.filter(z => z.id !== zoneId));
    toast.success('Zona removida');
  }, []);

  // Atualizar config
  const updateConfig = useCallback((updates: Partial<PPEConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Obter label do PPE
  const getPPELabel = useCallback((type: PPEType): string => {
    return PPE_LABELS[type] || type;
  }, []);

  return {
    isDetecting,
    zones,
    violations,
    currentStatuses,
    stats,
    config,
    detectPPE,
    startDetection,
    stopDetection,
    acknowledgeViolation,
    clearViolations,
    addZone,
    removeZone,
    updateConfig,
    getPPELabel,
  };
}

export default usePPEDetection;
