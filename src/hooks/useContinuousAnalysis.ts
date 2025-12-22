/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useContinuousAnalysis
 * 
 * Motor principal para análise contínua de vídeo com IA.
 * Gerencia sessões de análise, avaliação de regras e geração de alertas.
 * 
 * @example
 * const { 
 *   startAnalysis, 
 *   stopAnalysis, 
 *   session,
 *   history 
 * } = useContinuousAnalysis({
 *   cameraId: 'cam-001',
 *   getFrame: () => videoRef.current?.getCurrentFrame(),
 *   onAlertGenerated: (alert) => createAlert(alert),
 * });
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  ContinuousAnalysisConfig,
  AnalysisSession,
  AnalysisSessionStatus,
  SessionStats,
  AnalysisHistoryEntry,
  RuleEvaluation,
  ConditionEvaluation,
  ContinuousAnalysisEvents,
  defaultAnalysisConfig,
  defaultAlertThresholds,
  isWithinSchedule,
  getNextScheduledTime,
  meetsSeverityThreshold,
} from '@/types/continuousAnalysis';
import {
  AnalysisType,
  AnalysisResult,
  SecurityAnalysis,
  SafetyAnalysis,
  ProductivityAnalysis,
  Detection,
  AnalysisAlert,
} from '@/hooks/useImageAnalysis';
import { DbRule } from '@/types/rules';

// ============================================
// TIPOS DO HOOK
// ============================================

interface UseContinuousAnalysisOptions extends ContinuousAnalysisEvents {
  /** ID da câmera */
  cameraId: string;
  
  /** Nome da câmera (para alertas) */
  cameraName?: string;
  
  /** Função para obter frame atual */
  getFrame: () => string | null;
  
  /** Configuração inicial */
  config?: Partial<ContinuousAnalysisConfig>;
  
  /** Regras a avaliar */
  rules?: DbRule[];
  
  /** Auto-start quando montado */
  autoStart?: boolean;
  
  /** Criar alertas no banco? */
  createAlerts?: boolean;
  
  /** Salvar histórico no banco? */
  saveToDatabase?: boolean;
}

interface UseContinuousAnalysisReturn {
  /** Sessão atual */
  session: AnalysisSession | null;
  
  /** Histórico de análises */
  history: AnalysisHistoryEntry[];
  
  /** Última análise */
  lastAnalysis: AnalysisResult | null;
  
  /** Está analisando agora? */
  isAnalyzing: boolean;
  
  /** Iniciar análise contínua */
  startAnalysis: (config?: Partial<ContinuousAnalysisConfig>) => void;
  
  /** Parar análise */
  stopAnalysis: () => void;
  
  /** Pausar análise */
  pauseAnalysis: () => void;
  
  /** Retomar análise */
  resumeAnalysis: () => void;
  
  /** Executar uma análise manual */
  analyzeOnce: (type?: AnalysisType) => Promise<AnalysisResult | null>;
  
  /** Atualizar configuração */
  updateConfig: (updates: Partial<ContinuousAnalysisConfig>) => void;
  
  /** Limpar histórico */
  clearHistory: () => void;
  
  /** Exportar histórico */
  exportHistory: () => AnalysisHistoryEntry[];
}

// ============================================
// ESTATÍSTICAS INICIAIS
// ============================================

const initialStats: SessionStats = {
  totalAnalyses: 0,
  successfulAnalyses: 0,
  failedAnalyses: 0,
  alertsGenerated: 0,
  totalPeopleDetected: 0,
  avgPeoplePerAnalysis: 0,
  avgAnalysisTime: 0,
  totalRuntime: 0,
  successRate: 100,
};

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useContinuousAnalysis(
  options: UseContinuousAnalysisOptions
): UseContinuousAnalysisReturn {
  const {
    cameraId,
    cameraName = 'Câmera',
    getFrame,
    config: initialConfig,
    rules = [],
    autoStart = false,
    createAlerts = true,
    saveToDatabase = false,
    onAnalysisStart,
    onAnalysisComplete,
    onAnalysisError,
    onAlertGenerated,
    onRuleViolation,
    onSessionStart,
    onSessionPause,
    onSessionResume,
    onSessionStop,
    onStatsUpdate,
  } = options;

  // Estado
  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);
  const [lastAnalysis, setLastAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Refs para evitar stale closures
  const configRef = useRef<ContinuousAnalysisConfig | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef<AnalysisSession | null>(null);
  const rulesRef = useRef<DbRule[]>(rules);
  const analysisTimesRef = useRef<number[]>([]);

  // Atualizar ref de regras
  useEffect(() => {
    rulesRef.current = rules;
  }, [rules]);

  // ============================================
  // ANÁLISE DE IMAGEM
  // ============================================

  const analyzeImage = useCallback(async (
    base64: string,
    analysisType: AnalysisType
  ): Promise<AnalysisResult | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: {
          imageBase64: base64,
          analysisType,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.analysis as AnalysisResult;
    } catch (error) {
      // rm
      throw error;
    }
  }, []);

  // ============================================
  // AVALIAÇÃO DE REGRAS
  // ============================================

  const evaluateRules = useCallback((
    analysis: AnalysisResult,
    analysisType: AnalysisType
  ): RuleEvaluation[] => {
    const evaluations: RuleEvaluation[] = [];
    const activeRules = rulesRef.current.filter(r => 
      r.is_active && 
      (r.cameras.length === 0 || r.cameras.includes(cameraId))
    );

    for (const rule of activeRules) {
      const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
      const conditionEvaluations: ConditionEvaluation[] = [];
      let allConditionsMet = true;

      for (const conditionRaw of conditions) {
        // Cast para any para acessar propriedades JSON
        const condition = conditionRaw as any;
        let actualValue = 0;
        let satisfied = false;

        // Extrair valor atual baseado no tipo de condição
        const conditionType = condition?.type;
        switch (conditionType) {
          case 'people_count':
            actualValue = analysis.people_count || 0;
            break;
          case 'crowd_density':
            actualValue = analysis.people_count || 0;
            break;
          case 'no_ppe':
            if ('ppe_compliance' in analysis) {
              actualValue = (analysis as SafetyAnalysis).ppe_compliance?.non_compliant || 0;
            }
            break;
          // Adicionar mais tipos conforme necessário
        }

        // Avaliar condição
        const expectedValue = condition?.value || 0;
        const operator = condition?.operator;
        switch (operator) {
          case 'greater_than':
            satisfied = actualValue > expectedValue;
            break;
          case 'less_than':
            satisfied = actualValue < expectedValue;
            break;
          case 'equals':
            satisfied = actualValue === expectedValue;
            break;
          case 'between':
            const value2 = condition?.value2 || 0;
            satisfied = actualValue >= expectedValue && actualValue <= value2;
            break;
        }

        conditionEvaluations.push({
          type: conditionType || 'unknown',
          operator: operator || 'equals',
          expectedValue,
          actualValue,
          satisfied,
        });

        if (!satisfied) allConditionsMet = false;
      }

      if (allConditionsMet && conditions.length > 0) {
        evaluations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          violated: true,
          conditions: conditionEvaluations,
          actions: rule.actions || [],
          severity: rule.severity as any,
          message: `Regra "${rule.name}" violada: ${rule.description || 'Condições atendidas'}`,
        });
      }
    }

    return evaluations;
  }, [cameraId]);

  // ============================================
  // VERIFICAR THRESHOLDS
  // ============================================

  const checkThresholds = useCallback((
    analysis: AnalysisResult,
    thresholds: ContinuousAnalysisConfig['alertThresholds']
  ): AnalysisAlert[] => {
    const alerts: AnalysisAlert[] = [];

    // Verificar contagem de pessoas
    if (thresholds.maxPeopleCount !== undefined) {
      if (analysis.people_count > thresholds.maxPeopleCount) {
        alerts.push({
          type: 'security',
          severity: 'high',
          message: `Excesso de pessoas detectado: ${analysis.people_count} (máximo: ${thresholds.maxPeopleCount})`,
          recommendation: 'Verificar área e tomar ação corretiva',
        });
      }
    }

    if (thresholds.minPeopleCount !== undefined) {
      if (analysis.people_count < thresholds.minPeopleCount) {
        alerts.push({
          type: 'operations',
          severity: 'medium',
          message: `Área com poucas pessoas: ${analysis.people_count} (mínimo: ${thresholds.minPeopleCount})`,
          recommendation: 'Verificar se área deveria estar ocupada',
        });
      }
    }

    // Verificar conformidade EPI
    if ('ppe_compliance' in analysis && thresholds.minPPECompliance !== undefined) {
      const safetyAnalysis = analysis as SafetyAnalysis;
      const total = safetyAnalysis.ppe_compliance.compliant + safetyAnalysis.ppe_compliance.non_compliant;
      const complianceRate = total > 0 
        ? (safetyAnalysis.ppe_compliance.compliant / total) * 100 
        : 100;

      if (complianceRate < thresholds.minPPECompliance) {
        alerts.push({
          type: 'safety',
          severity: 'critical',
          message: `Conformidade EPI baixa: ${complianceRate.toFixed(0)}% (mínimo: ${thresholds.minPPECompliance}%)`,
          recommendation: `EPIs faltando: ${safetyAnalysis.ppe_compliance.missing_items.join(', ')}`,
        });
      }
    }

    // Verificar ociosidade
    if ('idle_count' in analysis && thresholds.maxIdleRate !== undefined) {
      const prodAnalysis = analysis as ProductivityAnalysis;
      const total = prodAnalysis.working_count + prodAnalysis.idle_count;
      const idleRate = total > 0 ? (prodAnalysis.idle_count / total) * 100 : 0;

      if (idleRate > thresholds.maxIdleRate) {
        alerts.push({
          type: 'operations',
          severity: 'medium',
          message: `Alta taxa de ociosidade: ${idleRate.toFixed(0)}% (máximo: ${thresholds.maxIdleRate}%)`,
          recommendation: 'Verificar alocação de tarefas',
        });
      }
    }

    // Verificar detecções de alta severidade
    if ('detections' in analysis) {
      const secAnalysis = analysis as SecurityAnalysis;
      for (const detection of secAnalysis.detections || []) {
        if (meetsSeverityThreshold(detection.severity, thresholds.minSeverity)) {
          if (detection.confidence >= thresholds.minConfidence) {
            // Verificar tipo de detecção
            if (!thresholds.alertOnDetectionTypes || 
                thresholds.alertOnDetectionTypes.includes(detection.type)) {
              alerts.push({
                type: 'security',
                severity: detection.severity,
                message: detection.description,
                recommendation: `Verificar: ${detection.label}`,
              });
            }
          }
        }
      }
    }

    // Incluir alertas da própria análise
    if ('alerts' in analysis) {
      const secAnalysis = analysis as SecurityAnalysis;
      for (const alert of secAnalysis.alerts || []) {
        if (meetsSeverityThreshold(alert.severity, thresholds.minSeverity)) {
          alerts.push(alert);
        }
      }
    }

    return alerts;
  }, []);

  // ============================================
  // CRIAR ALERTA NO BANCO
  // ============================================

  const createAlertInDatabase = useCallback(async (
    alert: AnalysisAlert,
    analysis: AnalysisResult
  ) => {
    if (!createAlerts) return;

    try {
      await supabase.from('alerts').insert({
        camera_name: cameraName,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        is_read: false,
      });
    } catch (error) {
      // rm
    }
  }, [createAlerts, cameraName]);

  // ============================================
  // SALVAR HISTÓRICO NO BANCO
  // ============================================

  const saveHistoryToDatabase = useCallback(async (entry: AnalysisHistoryEntry) => {
    if (!saveToDatabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // rm
        return;
      }

      await supabase.from('analysis_history').insert({
        id: entry.id,
        camera_id: cameraId,
        user_id: user.id,
        timestamp: entry.timestamp.toISOString(),
        analysis_type: entry.analysisType,
        result: entry.result as any,
        confidence: 'confidence' in entry.result ? (entry.result as any).confidence : null,
        image_url: entry.snapshot || null,
      });

      // rm
    } catch (err) {
      // rm
    }
  }, [saveToDatabase, cameraId]);

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
      // Obter frame atual
      const frame = getFrame();
      if (!frame) {
        throw new Error('Não foi possível obter frame da câmera');
      }

      // Executar análise
      const result = await analyzeImage(frame, analysisType);
      if (!result) {
        throw new Error('Análise retornou resultado vazio');
      }

      const duration = Date.now() - startTime;
      analysisTimesRef.current.push(duration);

      // Avaliar regras
      const ruleEvaluations = evaluateRules(result, analysisType);
      const violatedRules = ruleEvaluations
        .filter(e => e.violated)
        .map(e => e.ruleId);

      // Verificar thresholds e gerar alertas
      const alerts = checkThresholds(result, config.alertThresholds);

      // Notificar violações de regras
      for (const evaluation of ruleEvaluations.filter(e => e.violated)) {
        onRuleViolation?.(cameraId, evaluation, result);
        
        // Criar alerta para regra violada
        const ruleAlert: AnalysisAlert = {
          type: 'security',
          severity: evaluation.severity,
          message: evaluation.message,
          recommendation: `Ações: ${evaluation.actions.join(', ')}`,
        };
        alerts.push(ruleAlert);
      }

      // Criar alertas no banco e notificar
      for (const alert of alerts) {
        await createAlertInDatabase(alert, result);
        onAlertGenerated?.(cameraId, alert, result);
      }

      // Criar entrada no histórico
      const historyEntry: AnalysisHistoryEntry = {
        id: crypto.randomUUID(),
        sessionId: currentSession.id,
        cameraId,
        analysisType,
        result,
        duration,
        alertsGenerated: alerts.length,
        violatedRules,
        timestamp: new Date(),
        success: true,
      };

      // Atualizar histórico local
      setHistory(prev => {
        const newHistory = [historyEntry, ...prev];
        return newHistory.slice(0, config.maxHistorySize);
      });

      // Salvar no banco
      await saveHistoryToDatabase(historyEntry);

      // Atualizar última análise
      setLastAnalysis(result);

      // Atualizar estatísticas da sessão
      setSession(prev => {
        if (!prev) return null;
        
        const newStats: SessionStats = {
          ...prev.stats,
          totalAnalyses: prev.stats.totalAnalyses + 1,
          successfulAnalyses: prev.stats.successfulAnalyses + 1,
          alertsGenerated: prev.stats.alertsGenerated + alerts.length,
          totalPeopleDetected: prev.stats.totalPeopleDetected + (result.people_count || 0),
          avgPeoplePerAnalysis: 
            (prev.stats.totalPeopleDetected + (result.people_count || 0)) / 
            (prev.stats.totalAnalyses + 1),
          avgAnalysisTime: 
            analysisTimesRef.current.reduce((a, b) => a + b, 0) / 
            analysisTimesRef.current.length,
          totalRuntime: Date.now() - prev.startedAt.getTime(),
          successRate: 
            ((prev.stats.successfulAnalyses + 1) / (prev.stats.totalAnalyses + 1)) * 100,
        };

        const newSession = {
          ...prev,
          stats: newStats,
          lastAnalysis: result,
          lastError: null,
          nextAnalysisAt: new Date(Date.now() + config.interval),
        };

        sessionRef.current = newSession;
        onStatsUpdate?.(newSession);
        return newSession;
      });

      onAnalysisComplete?.(cameraId, result, duration);
      return historyEntry;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const duration = Date.now() - startTime;

      // Criar entrada de erro no histórico
      const historyEntry: AnalysisHistoryEntry = {
        id: crypto.randomUUID(),
        sessionId: currentSession.id,
        cameraId,
        analysisType,
        result: { people_count: 0, summary: 'Erro na análise' } as any,
        duration,
        alertsGenerated: 0,
        violatedRules: [],
        timestamp: new Date(),
        success: false,
        error: errorMessage,
      };

      setHistory(prev => [historyEntry, ...prev].slice(0, config.maxHistorySize));

      // Atualizar sessão com erro
      setSession(prev => {
        if (!prev) return null;
        
        const newStats: SessionStats = {
          ...prev.stats,
          totalAnalyses: prev.stats.totalAnalyses + 1,
          failedAnalyses: prev.stats.failedAnalyses + 1,
          successRate: 
            (prev.stats.successfulAnalyses / (prev.stats.totalAnalyses + 1)) * 100,
        };

        const newSession = {
          ...prev,
          stats: newStats,
          lastError: errorMessage,
        };

        sessionRef.current = newSession;
        return newSession;
      });

      onAnalysisError?.(cameraId, error instanceof Error ? error : new Error(errorMessage));
      return historyEntry;

    } finally {
      setIsAnalyzing(false);
    }
  }, [
    cameraId,
    getFrame,
    analyzeImage,
    evaluateRules,
    checkThresholds,
    createAlertInDatabase,
    saveHistoryToDatabase,
    onAnalysisStart,
    onAnalysisComplete,
    onAnalysisError,
    onAlertGenerated,
    onRuleViolation,
    onStatsUpdate,
  ]);

  // ============================================
  // LOOP DE ANÁLISE
  // ============================================

  const runAnalysisLoop = useCallback(() => {
    const config = configRef.current;
    if (!config || !config.enabled) return;

    // Verificar agendamento
    if (!isWithinSchedule(config.schedule)) {
      setSession(prev => prev ? { ...prev, status: 'scheduled' } : null);
      
      // Agendar próxima verificação
      const nextTime = getNextScheduledTime(config.schedule, config.interval);
      const delay = nextTime.getTime() - Date.now();
      
      intervalRef.current = setTimeout(() => {
        runAnalysisLoop();
      }, Math.min(delay, 60000)); // Verificar no máximo a cada minuto
      
      return;
    }

    // Executar análises para cada tipo configurado
    const runAllAnalyses = async () => {
      for (const analysisType of config.analysisTypes) {
        await executeAnalysis(analysisType);
      }
    };

    runAllAnalyses();

    // Agendar próxima execução
    intervalRef.current = setTimeout(() => {
      runAnalysisLoop();
    }, config.interval);
  }, [executeAnalysis]);

  // ============================================
  // API PÚBLICA
  // ============================================

  const startAnalysis = useCallback((
    configOverrides?: Partial<ContinuousAnalysisConfig>
  ) => {
    // Parar sessão anterior
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
    }

    // Criar nova configuração
    const config: ContinuousAnalysisConfig = {
      id: crypto.randomUUID(),
      cameraId,
      ...defaultAnalysisConfig,
      ...initialConfig,
      ...configOverrides,
      enabled: true,
      alertThresholds: {
        ...defaultAlertThresholds,
        ...initialConfig?.alertThresholds,
        ...configOverrides?.alertThresholds,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ContinuousAnalysisConfig;

    configRef.current = config;
    analysisTimesRef.current = [];

    // Criar nova sessão
    const newSession: AnalysisSession = {
      id: crypto.randomUUID(),
      cameraId,
      status: 'running',
      config,
      stats: { ...initialStats },
      lastAnalysis: null,
      lastError: null,
      nextAnalysisAt: new Date(Date.now() + config.interval),
      startedAt: new Date(),
      pausedAt: null,
    };

    sessionRef.current = newSession;
    setSession(newSession);
    onSessionStart?.(newSession);

    // Iniciar loop
    runAnalysisLoop();
  }, [cameraId, initialConfig, runAnalysisLoop, onSessionStart]);

  const stopAnalysis = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }

    if (sessionRef.current) {
      const finalSession = {
        ...sessionRef.current,
        status: 'stopped' as const,
      };
      setSession(finalSession);
      onSessionStop?.(finalSession, 'user_requested');
    }

    configRef.current = null;
    sessionRef.current = null;
  }, [onSessionStop]);

  const pauseAnalysis = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }

    if (sessionRef.current && configRef.current) {
      configRef.current.enabled = false;
      
      const pausedSession = {
        ...sessionRef.current,
        status: 'paused' as const,
        pausedAt: new Date(),
      };
      
      sessionRef.current = pausedSession;
      setSession(pausedSession);
      onSessionPause?.(pausedSession);
    }
  }, [onSessionPause]);

  const resumeAnalysis = useCallback(() => {
    if (sessionRef.current && configRef.current) {
      configRef.current.enabled = true;
      
      const resumedSession = {
        ...sessionRef.current,
        status: 'running' as const,
        pausedAt: null,
      };
      
      sessionRef.current = resumedSession;
      setSession(resumedSession);
      onSessionResume?.(resumedSession);
      
      runAnalysisLoop();
    }
  }, [runAnalysisLoop, onSessionResume]);

  const analyzeOnce = useCallback(async (
    type: AnalysisType = 'security'
  ): Promise<AnalysisResult | null> => {
    // Criar config temporária se não existir
    if (!configRef.current) {
      configRef.current = {
        id: 'temp',
        cameraId,
        ...defaultAnalysisConfig,
        alertThresholds: defaultAlertThresholds,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ContinuousAnalysisConfig;
    }

    if (!sessionRef.current) {
      sessionRef.current = {
        id: 'temp',
        cameraId,
        status: 'idle',
        config: configRef.current,
        stats: { ...initialStats },
        lastAnalysis: null,
        lastError: null,
        nextAnalysisAt: null,
        startedAt: new Date(),
        pausedAt: null,
      };
    }

    const entry = await executeAnalysis(type);
    return entry?.result || null;
  }, [cameraId, executeAnalysis]);

  const updateConfig = useCallback((
    updates: Partial<ContinuousAnalysisConfig>
  ) => {
    if (configRef.current) {
      configRef.current = {
        ...configRef.current,
        ...updates,
        alertThresholds: {
          ...configRef.current.alertThresholds,
          ...updates.alertThresholds,
        },
        updatedAt: new Date(),
      };

      if (sessionRef.current) {
        sessionRef.current = {
          ...sessionRef.current,
          config: configRef.current,
        };
        setSession(sessionRef.current);
      }
    }
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const exportHistory = useCallback(() => {
    return [...history];
  }, [history]);

  // ============================================
  // EFEITOS
  // ============================================

  // Auto-start se configurado
  useEffect(() => {
    if (autoStart) {
      startAnalysis();
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [autoStart]); // Não incluir startAnalysis para evitar loop

  // ============================================
  // RETORNO
  // ============================================

  return {
    session,
    history,
    lastAnalysis,
    isAnalyzing,
    startAnalysis,
    stopAnalysis,
    pauseAnalysis,
    resumeAnalysis,
    analyzeOnce,
    updateConfig,
    clearHistory,
    exportHistory,
  };
}

export default useContinuousAnalysis;
