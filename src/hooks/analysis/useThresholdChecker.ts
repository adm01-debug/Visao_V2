/**
 * Threshold checking for continuous analysis alerts.
 */
import { useCallback } from 'react';
import {
  ContinuousAnalysisConfig,
  meetsSeverityThreshold,
} from '@/types/continuousAnalysis';
import {
  AnalysisResult,
  AnalysisAlert,
  SafetyAnalysis,
  SecurityAnalysis,
  ProductivityAnalysis,
} from '@/hooks/useImageAnalysis';

export function useThresholdChecker() {
  const checkThresholds = useCallback((
    analysis: AnalysisResult,
    thresholds: ContinuousAnalysisConfig['alertThresholds']
  ): AnalysisAlert[] => {
    const alerts: AnalysisAlert[] = [];

    if (thresholds.maxPeopleCount !== undefined && analysis.people_count > thresholds.maxPeopleCount) {
      alerts.push({
        type: 'security', severity: 'high',
        message: `Excesso de pessoas detectado: ${analysis.people_count} (máximo: ${thresholds.maxPeopleCount})`,
        recommendation: 'Verificar área e tomar ação corretiva',
      });
    }

    if (thresholds.minPeopleCount !== undefined && analysis.people_count < thresholds.minPeopleCount) {
      alerts.push({
        type: 'operations', severity: 'medium',
        message: `Área com poucas pessoas: ${analysis.people_count} (mínimo: ${thresholds.minPeopleCount})`,
        recommendation: 'Verificar se área deveria estar ocupada',
      });
    }

    if ('ppe_compliance' in analysis && thresholds.minPPECompliance !== undefined) {
      const sa = analysis as SafetyAnalysis;
      const total = sa.ppe_compliance.compliant + sa.ppe_compliance.non_compliant;
      const rate = total > 0 ? (sa.ppe_compliance.compliant / total) * 100 : 100;
      if (rate < thresholds.minPPECompliance) {
        alerts.push({
          type: 'safety', severity: 'critical',
          message: `Conformidade EPI baixa: ${rate.toFixed(0)}% (mínimo: ${thresholds.minPPECompliance}%)`,
          recommendation: `EPIs faltando: ${sa.ppe_compliance.missing_items.join(', ')}`,
        });
      }
    }

    if ('idle_count' in analysis && thresholds.maxIdleRate !== undefined) {
      const pa = analysis as ProductivityAnalysis;
      const total = pa.working_count + pa.idle_count;
      const idleRate = total > 0 ? (pa.idle_count / total) * 100 : 0;
      if (idleRate > thresholds.maxIdleRate) {
        alerts.push({
          type: 'operations', severity: 'medium',
          message: `Alta taxa de ociosidade: ${idleRate.toFixed(0)}% (máximo: ${thresholds.maxIdleRate}%)`,
          recommendation: 'Verificar alocação de tarefas',
        });
      }
    }

    if ('detections' in analysis) {
      const sec = analysis as SecurityAnalysis;
      for (const detection of sec.detections || []) {
        if (meetsSeverityThreshold(detection.severity, thresholds.minSeverity) &&
            detection.confidence >= thresholds.minConfidence &&
            (!thresholds.alertOnDetectionTypes || thresholds.alertOnDetectionTypes.includes(detection.type))) {
          alerts.push({
            type: 'security', severity: detection.severity,
            message: detection.description,
            recommendation: `Verificar: ${detection.label}`,
          });
        }
      }
    }

    if ('alerts' in analysis) {
      const sec = analysis as SecurityAnalysis;
      for (const alert of sec.alerts || []) {
        if (meetsSeverityThreshold(alert.severity, thresholds.minSeverity)) {
          alerts.push(alert);
        }
      }
    }

    return alerts;
  }, []);

  return { checkThresholds };
}
