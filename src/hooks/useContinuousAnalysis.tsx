/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useContinuousAnalysis
 * 
 * Gerencia análise contínua de câmeras por IA:
 * - Loop de captura e análise automática
 * - Controle de intervalo por câmera
 * - Geração de alertas
 * - Estatísticas de análise
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

type AnalysisType = 'security' | 'productivity' | 'safety' | 'counting' | 'detection';

interface AnalysisConfig {
  cameraId: string;
  enabled: boolean;
  intervalMs: number;
  types: AnalysisType[];
  minConfidence: number;
  createAlerts: boolean;
}

interface AnalysisResult {
  id: string;
  cameraId: string;
  timestamp: Date;
  type: AnalysisType;
  description: string;
  confidence: number;
  detections: Detection[];
  alertGenerated: boolean;
  processingTimeMs: number;
}

interface Detection {
  type: string;
  label: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  attributes?: Record<string, any>;
}

interface AnalysisStats {
  totalAnalyses: number;
  alertsGenerated: number;
  avgProcessingTime: number;
  lastAnalysis?: Date;
  analysesPerMinute: number;
}

interface UseContinuousAnalysisOptions {
  autoStart?: boolean;
  maxConcurrent?: number;
  onAnalysisComplete?: (result: AnalysisResult) => void;
  onAlertGenerated?: (result: AnalysisResult) => void;
  onError?: (error: Error, cameraId: string) => void;
}

interface UseContinuousAnalysisReturn {
  // Estado
  isRunning: boolean;
  configs: Map<string, AnalysisConfig>;
  results: AnalysisResult[];
  stats: AnalysisStats;
  errors: Map<string, Error>;
  
  // Ações
  start: () => void;
  stop: () => void;
  addCamera: (config: AnalysisConfig) => void;
  removeCamera: (cameraId: string) => void;
  updateConfig: (cameraId: string, config: Partial<AnalysisConfig>) => void;
  clearResults: () => void;
  analyzeNow: (cameraId: string) => Promise<AnalysisResult | null>;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useContinuousAnalysis(
  options: UseContinuousAnalysisOptions = {}
): UseContinuousAnalysisReturn {
  const {
    autoStart = false,
    maxConcurrent = 3,
    onAnalysisComplete,
    onAlertGenerated,
    onError,
  } = options;

  // Estado
  const [isRunning, setIsRunning] = useState(false);
  const [configs, setConfigs] = useState<Map<string, AnalysisConfig>>(new Map());
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());
  
  // Refs para controle de loop
  const intervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const runningAnalysesRef = useRef<Set<string>>(new Set());
  const statsRef = useRef<AnalysisStats>({
    totalAnalyses: 0,
    alertsGenerated: 0,
    avgProcessingTime: 0,
    analysesPerMinute: 0,
  });

  // Stats computadas
  const [stats, setStats] = useState<AnalysisStats>(statsRef.current);

  // Capturar frame do vídeo
  const captureFrame = useCallback(async (cameraId: string): Promise<string | null> => {
    try {
      // Buscar câmera no DOM pelo data-camera-id ou stream
      const videoElement = document.querySelector(
        `video[data-camera-id="${cameraId}"]`
      ) as HTMLVideoElement;

      if (!videoElement || videoElement.readyState < 2) {
        // Fallback: buscar thumbnail da câmera
        const { data: camera } = await supabase
          .from('cameras')
          .select('thumbnail, snapshot_url')
          .eq('id', cameraId)
          .single();

        return camera?.snapshot_url || camera?.thumbnail || null;
      }

      // Capturar frame do vídeo
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(videoElement, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.error(`Erro ao capturar frame da câmera ${cameraId}:`, error);
      return null;
    }
  }, []);

  // Executar análise
  const analyzeFrame = useCallback(async (
    cameraId: string,
    imageBase64: string,
    config: AnalysisConfig
  ): Promise<AnalysisResult | null> => {
    const startTime = Date.now();

    try {
      // Chamar edge function de análise
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: {
          imageBase64: imageBase64.split(',')[1], // Remover prefixo data:image
          cameraId,
          analysisTypes: config.types,
          minConfidence: config.minConfidence,
        },
      });

      if (error) throw error;

      const processingTime = Date.now() - startTime;

      // Construir resultado
      const result: AnalysisResult = {
        id: `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        cameraId,
        timestamp: new Date(),
        type: config.types[0] || 'security',
        description: data.description || 'Análise concluída',
        confidence: data.confidence || 0,
        detections: data.detections || [],
        alertGenerated: false,
        processingTimeMs: processingTime,
      };

      // Verificar se deve gerar alerta
      if (config.createAlerts && data.shouldAlert) {
        result.alertGenerated = true;
        
        // Salvar alerta no banco
        await supabase.from('alerts').insert({
          camera_id: cameraId,
          type: data.alertType || 'detection',
          severity: data.severity || 'medium',
          message: data.alertMessage || result.description,
          snapshot_url: imageBase64,
          ai_analysis: data,
        });

        onAlertGenerated?.(result);
        statsRef.current.alertsGenerated++;
      }

      // Salvar histórico (opcional)
      if (data.saveHistory !== false) {
        await supabase.from('analysis_history').insert({
          camera_id: cameraId,
          analysis_type: result.type,
          result: data,
          confidence: result.confidence,
          processing_time_ms: processingTime,
        });
      }

      // Atualizar stats
      statsRef.current.totalAnalyses++;
      statsRef.current.avgProcessingTime = 
        (statsRef.current.avgProcessingTime * (statsRef.current.totalAnalyses - 1) + processingTime) / 
        statsRef.current.totalAnalyses;
      statsRef.current.lastAnalysis = new Date();

      return result;
    } catch (error) {
      console.error(`Erro na análise da câmera ${cameraId}:`, error);
      throw error;
    }
  }, [onAlertGenerated]);

  // Analisar câmera agora
  const analyzeNow = useCallback(async (cameraId: string): Promise<AnalysisResult | null> => {
    const config = configs.get(cameraId);
    if (!config) {
      toast.error('Câmera não configurada para análise');
      return null;
    }

    // Verificar limite de concorrência
    if (runningAnalysesRef.current.size >= maxConcurrent) {
      toast.error('Limite de análises simultâneas atingido');
      return null;
    }

    runningAnalysesRef.current.add(cameraId);

    try {
      const frame = await captureFrame(cameraId);
      if (!frame) {
        throw new Error('Não foi possível capturar frame');
      }

      const result = await analyzeFrame(cameraId, frame, config);
      
      if (result) {
        setResults(prev => [result, ...prev].slice(0, 100)); // Manter últimos 100
        onAnalysisComplete?.(result);
        
        // Limpar erro anterior se houver
        setErrors(prev => {
          const next = new Map(prev);
          next.delete(cameraId);
          return next;
        });
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setErrors(prev => new Map(prev).set(cameraId, err));
      onError?.(err, cameraId);
      return null;
    } finally {
      runningAnalysesRef.current.delete(cameraId);
      setStats({ ...statsRef.current });
    }
  }, [configs, maxConcurrent, captureFrame, analyzeFrame, onAnalysisComplete, onError]);

  // Iniciar loop de análise para uma câmera
  const startCameraLoop = useCallback((cameraId: string, config: AnalysisConfig) => {
    // Limpar intervalo anterior se existir
    const existingInterval = intervalsRef.current.get(cameraId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    if (!config.enabled) return;

    // Criar novo intervalo
    const interval = setInterval(() => {
      if (isRunning && config.enabled) {
        analyzeNow(cameraId);
      }
    }, config.intervalMs);

    intervalsRef.current.set(cameraId, interval);

    // Executar primeira análise imediatamente
    analyzeNow(cameraId);
  }, [isRunning, analyzeNow]);

  // Parar loop de análise para uma câmera
  const stopCameraLoop = useCallback((cameraId: string) => {
    const interval = intervalsRef.current.get(cameraId);
    if (interval) {
      clearInterval(interval);
      intervalsRef.current.delete(cameraId);
    }
  }, []);

  // Iniciar todas as análises
  const start = useCallback(() => {
    setIsRunning(true);
    configs.forEach((config, cameraId) => {
      if (config.enabled) {
        startCameraLoop(cameraId, config);
      }
    });
    toast.success('Análise contínua iniciada');
  }, [configs, startCameraLoop]);

  // Parar todas as análises
  const stop = useCallback(() => {
    setIsRunning(false);
    intervalsRef.current.forEach((interval) => clearInterval(interval));
    intervalsRef.current.clear();
    runningAnalysesRef.current.clear();
    toast.info('Análise contínua parada');
  }, []);

  // Adicionar câmera
  const addCamera = useCallback((config: AnalysisConfig) => {
    setConfigs(prev => new Map(prev).set(config.cameraId, config));
    
    if (isRunning && config.enabled) {
      startCameraLoop(config.cameraId, config);
    }
  }, [isRunning, startCameraLoop]);

  // Remover câmera
  const removeCamera = useCallback((cameraId: string) => {
    stopCameraLoop(cameraId);
    setConfigs(prev => {
      const next = new Map(prev);
      next.delete(cameraId);
      return next;
    });
    setErrors(prev => {
      const next = new Map(prev);
      next.delete(cameraId);
      return next;
    });
  }, [stopCameraLoop]);

  // Atualizar configuração
  const updateConfig = useCallback((cameraId: string, updates: Partial<AnalysisConfig>) => {
    setConfigs(prev => {
      const existing = prev.get(cameraId);
      if (!existing) return prev;
      
      const updated = { ...existing, ...updates };
      const next = new Map(prev).set(cameraId, updated);
      
      // Reiniciar loop se necessário
      if (isRunning) {
        stopCameraLoop(cameraId);
        if (updated.enabled) {
          startCameraLoop(cameraId, updated);
        }
      }
      
      return next;
    });
  }, [isRunning, stopCameraLoop, startCameraLoop]);

  // Limpar resultados
  const clearResults = useCallback(() => {
    setResults([]);
    statsRef.current = {
      totalAnalyses: 0,
      alertsGenerated: 0,
      avgProcessingTime: 0,
      analysesPerMinute: 0,
    };
    setStats(statsRef.current);
  }, []);

  // Auto-start
  useEffect(() => {
    if (autoStart && configs.size > 0 && !isRunning) {
      start();
    }
  }, [autoStart, configs.size, isRunning, start]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      intervalsRef.current.forEach((interval) => clearInterval(interval));
    };
  }, []);

  // Calcular análises por minuto
  useEffect(() => {
    const interval = setInterval(() => {
      const oneMinuteAgo = Date.now() - 60000;
      const recentAnalyses = results.filter(
        r => new Date(r.timestamp).getTime() > oneMinuteAgo
      ).length;
      
      statsRef.current.analysesPerMinute = recentAnalyses;
      setStats({ ...statsRef.current });
    }, 10000);

    return () => clearInterval(interval);
  }, [results]);

  return {
    isRunning,
    configs,
    results,
    stats,
    errors,
    start,
    stop,
    addCamera,
    removeCamera,
    updateConfig,
    clearResults,
    analyzeNow,
  };
}

export default useContinuousAnalysis;
