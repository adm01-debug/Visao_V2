/**
 * VISÃO - Continuous Analysis Types
 */

import {
  AnalysisType,
  AnalysisResult,
  AnalysisAlert,
} from '@/hooks/useImageAnalysis';

// ============================================
// CONFIG
// ============================================

export interface ContinuousAnalysisConfig {
  id: string;
  cameraId: string;
  analysisTypes: AnalysisType[];
  interval: number;
  enabled: boolean;
  schedule?: { enabled: boolean; startTime: string; endTime: string; days: number[]; };
  alertThresholds: AlertThresholds;
  saveHistory: boolean;
  maxHistorySize: number;
  ruleIds?: string[];
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertThresholds {
  maxPeopleCount?: number;
  minPeopleCount?: number;
  minSeverity: 'low' | 'medium' | 'high' | 'critical';
  minPPECompliance?: number;
  maxIdleRate?: number;
  minOccupancyRate?: number;
  alertOnDetectionTypes?: ('person' | 'vehicle' | 'object' | 'behavior')[];
  minConfidence: number;
}

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
// SESSION
// ============================================

export type AnalysisSessionStatus = 'idle' | 'running' | 'paused' | 'error' | 'stopped' | 'scheduled';

export interface AnalysisSession {
  id: string;
  cameraId: string;
  status: AnalysisSessionStatus;
  config: ContinuousAnalysisConfig;
  stats: SessionStats;
  lastAnalysis: AnalysisResult | null;
  lastError: string | null;
  nextAnalysisAt: Date | null;
  startedAt: Date;
  pausedAt: Date | null;
}

export interface SessionStats {
  totalAnalyses: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  alertsGenerated: number;
  totalPeopleDetected: number;
  avgPeoplePerAnalysis: number;
  avgAnalysisTime: number;
  totalRuntime: number;
  successRate: number;
}

// ============================================
// HISTORY & RULES
// ============================================

export interface AnalysisHistoryEntry {
  id: string;
  sessionId: string;
  cameraId: string;
  analysisType: AnalysisType;
  result: AnalysisResult;
  duration: number;
  alertsGenerated: number;
  violatedRules: string[];
  snapshot?: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  violated: boolean;
  conditions: ConditionEvaluation[];
  actions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export interface ConditionEvaluation {
  type: string;
  operator: string;
  expectedValue: number;
  actualValue: number;
  satisfied: boolean;
}

// ============================================
// EVENTS
// ============================================

export interface ContinuousAnalysisEvents {
  onAnalysisStart?: (cameraId: string, analysisType: AnalysisType) => void;
  onAnalysisComplete?: (cameraId: string, result: AnalysisResult, duration: number) => void;
  onAnalysisError?: (cameraId: string, error: Error) => void;
  onAlertGenerated?: (cameraId: string, alert: AnalysisAlert, analysis: AnalysisResult) => void;
  onRuleViolation?: (cameraId: string, evaluation: RuleEvaluation, analysis: AnalysisResult) => void;
  onSessionStart?: (session: AnalysisSession) => void;
  onSessionPause?: (session: AnalysisSession) => void;
  onSessionResume?: (session: AnalysisSession) => void;
  onSessionStop?: (session: AnalysisSession, reason: string) => void;
  onStatsUpdate?: (session: AnalysisSession) => void;
}

// ============================================
// BATCH
// ============================================

export interface BatchAnalysisConfig {
  cameraIds: string[];
  baseConfig: Partial<ContinuousAnalysisConfig>;
  cameraOverrides?: Record<string, Partial<ContinuousAnalysisConfig>>;
  maxConcurrent: number;
  strategy: 'round-robin' | 'priority' | 'adaptive';
}

export interface BatchAnalysisStatus {
  totalCameras: number;
  activeCameras: number;
  pausedCameras: number;
  errorCameras: number;
  analysesPerMinute: number;
  alertsPerMinute: number;
  cameraStatuses: Record<string, AnalysisSessionStatus>;
}
