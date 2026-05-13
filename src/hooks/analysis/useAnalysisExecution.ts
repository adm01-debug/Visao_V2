/**
 * Analysis execution logic extracted from useContinuousAnalysis.
 */
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  ContinuousAnalysisConfig,
  AnalysisSession,
  SessionStats,
  AnalysisHistoryEntry,
  RuleEvaluation,
} from '@/types/continuousAnalysis';
import {
  AnalysisType,
  AnalysisResult,
  AnalysisAlert,
} from '@/hooks/useImageAnalysis';

interface ExecutionCallbacks {
  onAnalysisStart?: (cameraId: string, type: AnalysisType) => void;
  onAnalysisComplete?: (cameraId: string, result: AnalysisResult, duration: number) => void;
  onAnalysisError?: (cameraId: string, error: Error) => void;
  onAlertGenerated?: (cameraId: string, alert: AnalysisAlert, result: AnalysisResult) => void;
  onRuleViolation?: (cameraId: string, evaluation: any, result: AnalysisResult) => void;
  onStatsUpdate?: (session: AnalysisSession) => void;
}

interface ExecutionDeps {
  cameraId: string;
  getFrame: () => string | null;
  evaluateRules: (result: AnalysisResult, type: AnalysisType) => any[];
  checkThresholds: (result: AnalysisResult, thresholds: ContinuousAnalysisConfig['alertThresholds']) => AnalysisAlert[];
  createAlertInDatabase: (alert: AnalysisAlert, result: AnalysisResult) => Promise<void>;
  saveHistoryToDatabase: (entry: AnalysisHistoryEntry) => Promise<void>;
}

export function useAnalysisExecution(
  deps: ExecutionDeps,
  callbacks: ExecutionCallbacks,
  configRef: React.MutableRefObject<ContinuousAnalysisConfig | null>,
  sessionRef: React.MutableRefObject<AnalysisSession | null>,
  setSession: React.Dispatch<React.SetStateAction<AnalysisSession | null>>,
  setHistory: React.Dispatch<React.SetStateAction<AnalysisHistoryEntry[]>>,
  setLastAnalysis: React.Dispatch<React.SetStateAction<AnalysisResult | null>>,
  setIsAnalyzing: React.Dispatch<React.SetStateAction<boolean>>,
) {
  const analysisTimesRef = useRef<number[]>([]);

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

  const executeAnalysis = useCallback(async (
    analysisType: AnalysisType
  ): Promise<AnalysisHistoryEntry | null> => {
    const config = configRef.current;
    const currentSession = sessionRef.current;
    if (!config || !currentSession) return null;

    const startTime = Date.now();
    setIsAnalyzing(true);
    callbacks.onAnalysisStart?.(deps.cameraId, analysisType);

    try {
      const frame = deps.getFrame();
      if (!frame) throw new Error('Não foi possível obter frame da câmera');

      const result = await analyzeImage(frame, analysisType);
      if (!result) throw new Error('Análise retornou resultado vazio');

      const duration = Date.now() - startTime;
      analysisTimesRef.current.push(duration);

      const ruleEvaluations = deps.evaluateRules(result, analysisType);
      const violatedRules = ruleEvaluations.filter((e: any) => e.violated).map((e: any) => e.ruleId);
      const alerts = deps.checkThresholds(result, config.alertThresholds);

      for (const evaluation of ruleEvaluations.filter((e: any) => e.violated)) {
        callbacks.onRuleViolation?.(deps.cameraId, evaluation, result);
        const ruleAlert: AnalysisAlert = {
          type: 'security', severity: evaluation.severity,
          message: evaluation.message,
          recommendation: `Ações: ${evaluation.actions.join(', ')}`,
        };
        alerts.push(ruleAlert);
      }

      for (const alert of alerts) {
        await deps.createAlertInDatabase(alert, result);
        callbacks.onAlertGenerated?.(deps.cameraId, alert, result);
      }

      const historyEntry: AnalysisHistoryEntry = {
        id: crypto.randomUUID(), sessionId: currentSession.id,
        cameraId: deps.cameraId, analysisType, result, duration,
        alertsGenerated: alerts.length, violatedRules,
        timestamp: new Date(), success: true,
      };

      setHistory(prev => [historyEntry, ...prev].slice(0, config.maxHistorySize));
      await deps.saveHistoryToDatabase(historyEntry);
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
        callbacks.onStatsUpdate?.(newSession);
        return newSession;
      });

      callbacks.onAnalysisComplete?.(deps.cameraId, result, duration);
      return historyEntry;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const duration = Date.now() - startTime;

      const historyEntry: AnalysisHistoryEntry = {
        id: crypto.randomUUID(), sessionId: currentSession.id,
        cameraId: deps.cameraId, analysisType,
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

      callbacks.onAnalysisError?.(deps.cameraId, error instanceof Error ? error : new Error(errorMessage));
      return historyEntry;
    } finally {
      setIsAnalyzing(false);
    }
  }, [deps, callbacks, configRef, sessionRef, analyzeImage, setSession, setHistory, setLastAnalysis, setIsAnalyzing]);

  return { executeAnalysis, analysisTimesRef };
}
