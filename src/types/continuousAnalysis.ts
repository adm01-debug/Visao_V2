/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Tipos para Análise Contínua de Vídeo
 * 
 * Define estruturas para:
 * - Configuração de análise automática
 * - Sessões de monitoramento
 * - Histórico de análises
 * - Avaliação de regras
 */

import { 
  AnalysisType, 
  SecurityAnalysis, 
  SafetyAnalysis, 
  ProductivityAnalysis,
  AnalysisResult,
  Detection,
  AnalysisAlert,
} from '@/hooks/useImageAnalysis';

// ============================================
// CONFIGURAÇÃO DE ANÁLISE CONTÍNUA
// ============================================

export interface ContinuousAnalysisConfig {
  /** ID único da configuração */
  id: string;
  
  /** ID da câmera */
  cameraId: string;
  
  /** Tipos de análise a executar */
  analysisTypes: AnalysisType[];
  
  /** Intervalo entre análises (ms) - mínimo 3000 */
  interval: number;
  
  /** Está ativo? */
  enabled: boolean;
  
  /** Agendamento (opcional) */
  schedule?: {
    enabled: boolean;
    startTime: string; // HH:mm
    endTime: string;
    days: number[]; // 0-6 (Dom-Sab)
  };
  
  /** Thresholds para alertas automáticos */
  alertThresholds: AlertThresholds;
  
  /** Salvar histórico de análises? */
  saveHistory: boolean;
  
  /** Máximo de análises no histórico */
  maxHistorySize: number;
  
  /** IDs das regras a avaliar */
  ruleIds?: string[];
  
  /** Prioridade (1-10, maior = mais importante) */
  priority: number;
  
  /** Criado em */
  createdAt: Date;
  
  /** Atualizado em */
  updatedAt: Date;
}

export interface AlertThresholds {
  /** Máximo de pessoas antes de alertar */
  maxPeopleCount?: number;
  
  /** Mínimo de pessoas (área vazia) */
  minPeopleCount?: number;
  
  /** Severidade mínima para criar alerta */
  minSeverity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Taxa mínima de conformidade EPI (%) */
  minPPECompliance?: number;
  
  /** Taxa máxima de ociosidade (%) */
  maxIdleRate?: number;
  
  /** Taxa mínima de ocupação (%) */
  minOccupancyRate?: number;
  
  /** Tipos de detecção que geram alerta */
  alertOnDetectionTypes?: ('person' | 'vehicle' | 'object' | 'behavior')[];
  
  /** Confiança mínima para considerar detecção */
  minConfidence: number;
}

// Configuração padrão
export const defaultAlertThresholds: AlertThresholds = {
  minSeverity: 'medium',
  minConfidence: 0.7,
  minPPECompliance: 90,
  maxIdleRate: 30,
};

export const defaultAnalysisConfig: Partial<ContinuousAnalysisConfig> = {
  analysisTypes: ['security'],
  interval: 5000,
  enabled: false,
  alertThresholds: defaultAlertThresholds,
  saveHistory: true,
  maxHistorySize: 100,
  priority: 5,
};

// ============================================
// SESSÃO DE ANÁLISE CONTÍNUA
// ============================================

export type AnalysisSessionStatus = 
  | 'idle'        // Aguardando
  | 'running'     // Executando análises
  | 'paused'      // Pausado temporariamente
  | 'error'       // Erro (vai tentar novamente)
  | 'stopped'     // Parado pelo usuário
  | 'scheduled';  // Aguardando horário agendado

export interface AnalysisSession {
  /** ID da sessão */
  id: string;
  
  /** ID da câmera */
  cameraId: string;
  
  /** Status atual */
  status: AnalysisSessionStatus;
  
  /** Configuração ativa */
  config: ContinuousAnalysisConfig;
  
  /** Estatísticas da sessão */
  stats: SessionStats;
  
  /** Última análise */
  lastAnalysis: AnalysisResult | null;
  
  /** Último erro */
  lastError: string | null;
  
  /** Próxima análise agendada */
  nextAnalysisAt: Date | null;
  
  /** Iniciado em */
  startedAt: Date;
  
  /** Pausado em (se aplicável) */
  pausedAt: Date | null;
}

export interface SessionStats {
  /** Total de análises executadas */
  totalAnalyses: number;
  
  /** Análises com sucesso */
  successfulAnalyses: number;
  
  /** Análises com erro */
  failedAnalyses: number;
  
  /** Alertas gerados */
  alertsGenerated: number;
  
  /** Total de pessoas detectadas */
  totalPeopleDetected: number;
  
  /** Média de pessoas por análise */
  avgPeoplePerAnalysis: number;
  
  /** Tempo médio de análise (ms) */
  avgAnalysisTime: number;
  
  /** Tempo total de execução (ms) */
  totalRuntime: number;
  
  /** Taxa de sucesso (%) */
  successRate: number;
}

// ============================================
// HISTÓRICO DE ANÁLISES
// ============================================

export interface AnalysisHistoryEntry {
  /** ID único */
  id: string;
  
  /** ID da sessão */
  sessionId: string;
  
  /** ID da câmera */
  cameraId: string;
  
  /** Tipo de análise */
  analysisType: AnalysisType;
  
  /** Resultado da análise */
  result: AnalysisResult;
  
  /** Duração da análise (ms) */
  duration: number;
  
  /** Alertas gerados */
  alertsGenerated: number;
  
  /** Regras violadas */
  violatedRules: string[];
  
  /** Snapshot da imagem (opcional) */
  snapshot?: string;
  
  /** Timestamp */
  timestamp: Date;
  
  /** Sucesso? */
  success: boolean;
  
  /** Erro (se houver) */
  error?: string;
}

// ============================================
// AVALIAÇÃO DE REGRAS
// ============================================

export interface RuleEvaluation {
  /** ID da regra */
  ruleId: string;
  
  /** Nome da regra */
  ruleName: string;
  
  /** Regra foi violada? */
  violated: boolean;
  
  /** Condições avaliadas */
  conditions: ConditionEvaluation[];
  
  /** Ações a executar (se violada) */
  actions: string[];
  
  /** Severidade */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Mensagem */
  message: string;
}

export interface ConditionEvaluation {
  /** Tipo da condição */
  type: string;
  
  /** Operador */
  operator: string;
  
  /** Valor esperado */
  expectedValue: number;
  
  /** Valor encontrado */
  actualValue: number;
  
  /** Condição satisfeita? */
  satisfied: boolean;
}

// ============================================
// EVENTOS DA ANÁLISE CONTÍNUA
// ============================================

export interface ContinuousAnalysisEvents {
  /** Análise iniciada */
  onAnalysisStart?: (cameraId: string, analysisType: AnalysisType) => void;
  
  /** Análise concluída */
  onAnalysisComplete?: (
    cameraId: string, 
    result: AnalysisResult, 
    duration: number
  ) => void;
  
  /** Erro na análise */
  onAnalysisError?: (cameraId: string, error: Error) => void;
  
  /** Alerta gerado */
  onAlertGenerated?: (
    cameraId: string, 
    alert: AnalysisAlert,
    analysis: AnalysisResult
  ) => void;
  
  /** Regra violada */
  onRuleViolation?: (
    cameraId: string, 
    evaluation: RuleEvaluation,
    analysis: AnalysisResult
  ) => void;
  
  /** Sessão iniciada */
  onSessionStart?: (session: AnalysisSession) => void;
  
  /** Sessão pausada */
  onSessionPause?: (session: AnalysisSession) => void;
  
  /** Sessão retomada */
  onSessionResume?: (session: AnalysisSession) => void;
  
  /** Sessão encerrada */
  onSessionStop?: (session: AnalysisSession, reason: string) => void;
  
  /** Stats atualizadas */
  onStatsUpdate?: (session: AnalysisSession) => void;
}

// ============================================
// ANÁLISE EM LOTE (MÚLTIPLAS CÂMERAS)
// ============================================

export interface BatchAnalysisConfig {
  /** IDs das câmeras */
  cameraIds: string[];
  
  /** Configuração base para todas */
  baseConfig: Partial<ContinuousAnalysisConfig>;
  
  /** Configurações específicas por câmera */
  cameraOverrides?: Record<string, Partial<ContinuousAnalysisConfig>>;
  
  /** Máximo de análises simultâneas */
  maxConcurrent: number;
  
  /** Estratégia de escalonamento */
  strategy: 'round-robin' | 'priority' | 'adaptive';
}

export interface BatchAnalysisStatus {
  /** Total de câmeras */
  totalCameras: number;
  
  /** Câmeras ativas */
  activeCameras: number;
  
  /** Câmeras pausadas */
  pausedCameras: number;
  
  /** Câmeras com erro */
  errorCameras: number;
  
  /** Análises por minuto (média) */
  analysesPerMinute: number;
  
  /** Alertas por minuto (média) */
  alertsPerMinute: number;
  
  /** Status por câmera */
  cameraStatuses: Record<string, AnalysisSessionStatus>;
}

// ============================================
// HELPERS
// ============================================

/**
 * Verifica se o horário atual está dentro do agendamento
 */
export function isWithinSchedule(schedule?: ContinuousAnalysisConfig['schedule']): boolean {
  if (!schedule?.enabled) return true;
  
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5); // HH:mm
  
  // Verificar dia da semana
  if (!schedule.days.includes(currentDay)) return false;
  
  // Verificar horário
  const { startTime, endTime } = schedule;
  
  if (startTime <= endTime) {
    // Horário normal (ex: 08:00 - 18:00)
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    // Horário cruzando meia-noite (ex: 22:00 - 06:00)
    return currentTime >= startTime || currentTime <= endTime;
  }
}

/**
 * Calcula próxima execução baseado no agendamento
 */
export function getNextScheduledTime(
  schedule: ContinuousAnalysisConfig['schedule'],
  interval: number
): Date {
  const now = new Date();
  
  if (!schedule?.enabled) {
    return new Date(now.getTime() + interval);
  }
  
  // Se está dentro do horário, próxima é agora + intervalo
  if (isWithinSchedule(schedule)) {
    return new Date(now.getTime() + interval);
  }
  
  // Encontrar próximo horário válido
  const { startTime, days } = schedule;
  const [startHour, startMinute] = startTime.split(':').map(Number);
  
  let nextDate = new Date(now);
  nextDate.setHours(startHour, startMinute, 0, 0);
  
  // Se já passou o horário de início hoje, ir para amanhã
  if (nextDate <= now) {
    nextDate.setDate(nextDate.getDate() + 1);
  }
  
  // Encontrar próximo dia válido
  let attempts = 0;
  while (!days.includes(nextDate.getDay()) && attempts < 7) {
    nextDate.setDate(nextDate.getDate() + 1);
    attempts++;
  }
  
  return nextDate;
}

/**
 * Mapeia severidade para prioridade numérica
 */
export function severityToPriority(severity: string): number {
  const map: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  return map[severity] || 0;
}

/**
 * Verifica se a severidade atende ao threshold mínimo
 */
export function meetsSeverityThreshold(
  severity: string,
  minSeverity: string
): boolean {
  return severityToPriority(severity) >= severityToPriority(minSeverity);
}
