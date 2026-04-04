/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useContinuousAnalysis (Refatorado)
 *
 * Motor principal para análise contínua de vídeo com IA.
 * Lógica modularizada em hooks especializados:
 * - useRuleEvaluation: avaliação de regras
 * - useThresholdChecker: verificação de limiares
 * - useAnalysisPersistence: persistência no banco
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  ContinuousAnalysisConfig,
  AnalysisSession,
  SessionStats,
  AnalysisHistoryEntry,
  ContinuousAnalysisEvents,
  defaultAnalysisConfig,
  defaultAlertThresholds,
  isWithinSchedule,
  getNextScheduledTime,
} from '@/types/continuousAnalysis';
import {
  AnalysisType,
  AnalysisResult,
  AnalysisAlert,
} from '@/hooks/useImageAnalysis';
import { DbRule } from '@/types/rules';
import { useRuleEvaluation } from '@/hooks/analysis/useRuleEvaluation';
import { useThresholdChecker } from '@/hooks/analysis/useThresholdChecker';
import { useAnalysisPersistence } from '@/hooks/analysis/useAnalysisPersistence';

// ============================================
// TIPOS
// ============================================

interface UseContinuousAnalysisOptions extends ContinuousAnalysisEvents {
  cameraId: string;
  cameraName?: string;
  getFrame: () => string | null;
  config?: Partial<ContinuousAnalysisConfig>;
  rules?: DbRule[];
  autoStart?: boolean;
  createAlerts?: boolean;
  saveToDatabase?: boolean;
}

interface UseContinuousAnalysisReturn {
  session: AnalysisSession | null;
  history: AnalysisHistoryEntry[];
  lastAnalysis: AnalysisResult | null;
  isAnalyzing: boolean;
  startAnalysis: (config?: Partial<ContinuousAnalysisConfig>) => void;
  stopAnalysis: () => void;
  pauseAnalysis: () => void;
  resumeAnalysis: () => void;
  analyzeOnce: (type?: AnalysisType) => Promise<AnalysisResult | null>;
  updateConfig: (updates: Partial<ContinuousAnalysisConfig>) => void;
  clearHistory: () => void;
  exportHistory: () => AnalysisHistoryEntry[];
}

const initialStats: SessionStats = {
  totalAnalyses: 0, successfulAnalyses: 0, failedAnalyses: 0,
  alertsGenerated: 0, totalPeopleDetected: 0, avgPeoplePerAnalysis: 0,
  avgAnalysisTime: 0, totalRuntime: 0, successRate: 100,
};

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useContinuousAnalysis(
  options: UseContinuousAnalysisOptions
): UseContinuousAnalysisReturn {
  const {
    cameraId, cameraName = 'Câmera', getFrame,
    config: initialConfig, rules = [], autoStart = false,
    createAlerts = true, saveToDatabase = false,
    onAnalysisStart, onAnalysisComplete, onAnalysisError,
    onAlertGenerated, onRuleViolation,
    onSessionStart, onSessionPause, onSessionResume, onSessionStop,
    onStatsUpdate,
  } = options;

  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);
  const [lastAnalysis, setLastAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const configRef = useRef<ContinuousAnalysisConfig | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef<AnalysisSession | null>(null);
  const analysisTimesRef = useRef<number[]>([]);

  // Extracted hooks
  const { evaluateRules } = useRuleEvaluation(cameraId, rules);
  const { checkThresholds } = useThresholdChecker();
  const { createAlertInDatabase, saveHistoryToDatabase } = useAnalysisPersistence(
    cameraId, cameraName, createAlerts, saveToDatabase
  );

  // ============================================
  // ANÁLISE DE IMAGEM
  // ============================================

  const analyzeImage = useCallback(async (
    base64: string, analysisType: AnalysisType
  ): Promise<AnalysisResult | null> => {
    const { data, error } = await supabase.functions.invoke('analyze-image', {
      body: { imageBase64: base64, analysisType },
    });
    if (error) throw error;
    if (!data.success) throw new Error(data.error);
    return data.analysis as AnalysisResult;
  }, []);

  // ============================================
  // EXECUTAR UMA ANÁLISE
  // ============================================

  const executeAnalysis = useCallback(async (
    analysisType: AnalysisType
  ): Promise<AnalysisHistoryEntry | null> => {
    const config = configRef.current;
    const currentSession = sessionRef.current;
    if (!config || !currentSession) return null;

    const startTime = Date.now();
    setIsAnalyzing(true);
    onAnalysisStart?.(cameraId, analysisType);

    try {
      const frame = getFrame();
      if (!frame) throw new Error('Não foi possível obter frame da câmera');

      const result = await analyzeImage(frame, analysisType);
      if (!result) throw new Error('Análise retornou resultado vazio');

      const duration = Date.now() - startTime;
      analysisTimesRef.current.push(duration);

      const ruleEvaluations = evaluateRules(result, analysisType);
      const violatedRules = ruleEvaluations.filter(e => e.violated).map(e => e.ruleId);
      const alerts = checkThresholds(result, config.alertThresholds);

      for (const evaluation of ruleEvaluations.filter(e => e.violated)) {
        onRuleViolation?.(cameraId, evaluation, result);
        const ruleAlert: AnalysisAlert = {
          type: 'security', severity: evaluation.severity,
          message: evaluation.message,
          recommendation: `Ações: ${evaluation.actions.join(', ')}`,
        };
        alerts.push(ruleAlert);
      }

      for (const alert of alerts) {
        await createAlertInDatabase(alert, result);
        onAlertGenerated?.(cameraId, alert, result);
      }

      const historyEntry: AnalysisHistoryEntry = {
        id: crypto.randomUUID(), sessionId: currentSession.id,
        cameraId, analysisType, result, duration,
        alertsGenerated: alerts.length, violatedRules,
        timestamp: new Date(), success: true,
      };

      setHistory(prev => [historyEntry, ...prev].slice(0, config.maxHistorySize));
      await saveHistoryToDatabase(historyEntry);
      setLastAnalysis(result);

      setSession(prev => {
        if (!prev) return null;
        const newStats: SessionStats = {
          ...prev.stats,
          totalAnalyses: prev.stats.totalAnalyses + 1,
          successfulAnalyses: prev.stats.successfulAnalyses + 1,
          alertsGenerated: prev.stats.alertsGenerated + alerts.length,
          totalPeopleDetected: prev.stats.totalPeopleDetected + (result.people_count || 0),
          avgPeoplePerAnalysis: (prev.stats.totalPeopleDetected + (result.people_count || 0)) / (prev.stats.totalAnalyses + 1),
          avgAnalysisTime: analysisTimesRef.current.reduce((a, b) => a + b, 0) / analysisTimesRef.current.length,
          totalRuntime: Date.now() - prev.startedAt.getTime(),
          successRate: ((prev.stats.successfulAnalyses + 1) / (prev.stats.totalAnalyses + 1)) * 100,
        };
        const newSession = { ...prev, stats: newStats, lastAnalysis: result, lastError: null, nextAnalysisAt: new Date(Date.now() + config.interval) };
        sessionRef.current = newSession;
        onStatsUpdate?.(newSession);
        return newSession;
      });

      onAnalysisComplete?.(cameraId, result, duration);
      return historyEntry;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const duration = Date.now() - startTime;

      const historyEntry: AnalysisHistoryEntry = {
        id: crypto.randomUUID(), sessionId: currentSession.id,
        cameraId, analysisType,
        result: { people_count: 0, summary: 'Erro na análise' } as AnalysisResult,
        duration, alertsGenerated: 0, violatedRules: [],
        timestamp: new Date(), success: false, error: errorMessage,
      };

      setHistory(prev => [historyEntry, ...prev].slice(0, config.maxHistorySize));
      setSession(prev => {
        if (!prev) return null;
        const newStats: SessionStats = {
          ...prev.stats,
          totalAnalyses: prev.stats.totalAnalyses + 1,
          failedAnalyses: prev.stats.failedAnalyses + 1,
          successRate: (prev.stats.successfulAnalyses / (prev.stats.totalAnalyses + 1)) * 100,
        };
        const newSession = { ...prev, stats: newStats, lastError: errorMessage };
        sessionRef.current = newSession;
        return newSession;
      });

      onAnalysisError?.(cameraId, error instanceof Error ? error : new Error(errorMessage));
      return historyEntry;
    } finally {
      setIsAnalyzing(false);
    }
  }, [cameraId, getFrame, analyzeImage, evaluateRules, checkThresholds, createAlertInDatabase, saveHistoryToDatabase, onAnalysisStart, onAnalysisComplete, onAnalysisError, onAlertGenerated, onRuleViolation, onStatsUpdate]);

  // ============================================
  // LOOP DE ANÁLISE
  // ============================================

  const runAnalysisLoop = useCallback(() => {
    const config = configRef.current;
    if (!config || !config.enabled) return;

    if (!isWithinSchedule(config.schedule)) {
      setSession(prev => prev ? { ...prev, status: 'scheduled' } : null);
      const nextTime = getNextScheduledTime(config.schedule, config.interval);
      const delay = nextTime.getTime() - Date.now();
      intervalRef.current = setTimeout(() => runAnalysisLoop(), Math.min(delay, 60000));
      return;
    }

    const runAll = async () => {
      for (const analysisType of config.analysisTypes) {
        await executeAnalysis(analysisType);
      }
    };
    runAll();

    intervalRef.current = setTimeout(() => runAnalysisLoop(), config.interval);
  }, [executeAnalysis]);

  // ============================================
  // API PÚBLICA
  // ============================================

  const startAnalysis = useCallback((configOverrides?: Partial<ContinuousAnalysisConfig>) => {
    if (intervalRef.current) clearTimeout(intervalRef.current);

    const config: ContinuousAnalysisConfig = {
      id: crypto.randomUUID(), cameraId,
      ...defaultAnalysisConfig, ...initialConfig, ...configOverrides,
      enabled: true,
      alertThresholds: { ...defaultAlertThresholds, ...initialConfig?.alertThresholds, ...configOverrides?.alertThresholds },
      createdAt: new Date(), updatedAt: new Date(),
    } as ContinuousAnalysisConfig;

    configRef.current = config;
    analysisTimesRef.current = [];

    const newSession: AnalysisSession = {
      id: crypto.randomUUID(), cameraId, status: 'running', config,
      stats: { ...initialStats }, lastAnalysis: null, lastError: null,
      nextAnalysisAt: new Date(Date.now() + config.interval),
      startedAt: new Date(), pausedAt: null,
    };

    sessionRef.current = newSession;
    setSession(newSession);
    onSessionStart?.(newSession);
    runAnalysisLoop();
  }, [cameraId, initialConfig, runAnalysisLoop, onSessionStart]);

  const stopAnalysis = useCallback(() => {
    if (intervalRef.current) { clearTimeout(intervalRef.current); intervalRef.current = null; }
    if (sessionRef.current) {
      const finalSession = { ...sessionRef.current, status: 'stopped' as const };
      setSession(finalSession);
      onSessionStop?.(finalSession, 'user_requested');
    }
    configRef.current = null;
    sessionRef.current = null;
  }, [onSessionStop]);

  const pauseAnalysis = useCallback(() => {
    if (intervalRef.current) { clearTimeout(intervalRef.current); intervalRef.current = null; }
    if (sessionRef.current && configRef.current) {
      configRef.current.enabled = false;
      const pausedSession = { ...sessionRef.current, status: 'paused' as const, pausedAt: new Date() };
      sessionRef.current = pausedSession;
      setSession(pausedSession);
      onSessionPause?.(pausedSession);
    }
  }, [onSessionPause]);

  const resumeAnalysis = useCallback(() => {
    if (sessionRef.current && configRef.current) {
      configRef.current.enabled = true;
      const resumedSession = { ...sessionRef.current, status: 'running' as const, pausedAt: null };
      sessionRef.current = resumedSession;
      setSession(resumedSession);
      onSessionResume?.(resumedSession);
      runAnalysisLoop();
    }
  }, [runAnalysisLoop, onSessionResume]);

  const analyzeOnce = useCallback(async (type: AnalysisType = 'security'): Promise<AnalysisResult | null> => {
    if (!configRef.current) {
      configRef.current = { id: 'temp', cameraId, ...defaultAnalysisConfig, alertThresholds: defaultAlertThresholds, createdAt: new Date(), updatedAt: new Date() } as ContinuousAnalysisConfig;
    }
    if (!sessionRef.current) {
      sessionRef.current = { id: 'temp', cameraId, status: 'idle', config: configRef.current, stats: { ...initialStats }, lastAnalysis: null, lastError: null, nextAnalysisAt: null, startedAt: new Date(), pausedAt: null };
    }
    const entry = await executeAnalysis(type);
    return entry?.result || null;
  }, [cameraId, executeAnalysis]);

  const updateConfig = useCallback((updates: Partial<ContinuousAnalysisConfig>) => {
    if (configRef.current) {
      configRef.current = { ...configRef.current, ...updates, alertThresholds: { ...configRef.current.alertThresholds, ...updates.alertThresholds }, updatedAt: new Date() };
      if (sessionRef.current) {
        sessionRef.current = { ...sessionRef.current, config: configRef.current };
        setSession(sessionRef.current);
      }
    }
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);
  const exportHistory = useCallback(() => [...history], [history]);

  useEffect(() => {
    if (autoStart) startAnalysis();
    return () => { if (intervalRef.current) clearTimeout(intervalRef.current); };
  }, [autoStart]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    session, history, lastAnalysis, isAnalyzing,
    startAnalysis, stopAnalysis, pauseAnalysis, resumeAnalysis,
    analyzeOnce, updateConfig, clearHistory, exportHistory,
  };
}

export default useContinuousAnalysis;
