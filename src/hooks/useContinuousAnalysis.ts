/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useContinuousAnalysis (Refatorado)
 *
 * Lógica modularizada em hooks especializados:
 * - useRuleEvaluation: avaliação de regras
 * - useThresholdChecker: verificação de limiares
 * - useAnalysisPersistence: persistência no banco
 * - useAnalysisExecution: execução de análise individual
 */

import { useState, useRef, useCallback, useEffect } from 'react';
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
} from '@/hooks/useImageAnalysis';
import { DbRule } from '@/types/rules';
import { useRuleEvaluation } from '@/hooks/analysis/useRuleEvaluation';
import { useThresholdChecker } from '@/hooks/analysis/useThresholdChecker';
import { useAnalysisPersistence } from '@/hooks/analysis/useAnalysisPersistence';
import { useAnalysisExecution } from '@/hooks/analysis/useAnalysisExecution';

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

  const { evaluateRules } = useRuleEvaluation(cameraId, rules);
  const { checkThresholds } = useThresholdChecker();
  const { createAlertInDatabase, saveHistoryToDatabase } = useAnalysisPersistence(
    cameraId, cameraName, createAlerts, saveToDatabase
  );

  const { executeAnalysis } = useAnalysisExecution(
    { cameraId, getFrame, evaluateRules, checkThresholds, createAlertInDatabase, saveHistoryToDatabase },
    { onAnalysisStart, onAnalysisComplete, onAnalysisError, onAlertGenerated, onRuleViolation, onStatsUpdate },
    configRef, sessionRef, setSession, setHistory, setLastAnalysis, setIsAnalyzing,
  );

  const loopRef = useRef<() => void>(() => {});

  const runAnalysisLoop = useCallback(() => {
    const config = configRef.current;
    if (!config || !config.enabled) return;

    if (!isWithinSchedule(config.schedule)) {
      setSession(prev => prev ? { ...prev, status: 'scheduled' } : null);
      const nextTime = getNextScheduledTime(config.schedule, config.interval);
      const delay = nextTime.getTime() - Date.now();
      intervalRef.current = setTimeout(() => loopRef.current(), Math.min(delay, 60000));
      return;
    }

    const runAll = async () => {
      for (const analysisType of config.analysisTypes) {
        await executeAnalysis(analysisType);
      }
    };
    runAll();

    intervalRef.current = setTimeout(() => loopRef.current(), config.interval);
  }, [executeAnalysis]);

  useEffect(() => {
    loopRef.current = runAnalysisLoop;
  }, [runAnalysisLoop]);

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
  }, [autoStart]);

  return {
    session, history, lastAnalysis, isAnalyzing,
    startAnalysis, stopAnalysis, pauseAnalysis, resumeAnalysis,
    analyzeOnce, updateConfig, clearHistory, exportHistory,
  };
}

export default useContinuousAnalysis;
