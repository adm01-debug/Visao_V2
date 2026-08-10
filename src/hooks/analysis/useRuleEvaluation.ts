/**
 * Rule evaluation engine for continuous analysis.
 * Extracts rule evaluation logic from useContinuousAnalysis.
 */
import { useCallback, useRef, useEffect } from 'react';
import { RuleEvaluation, ConditionEvaluation } from '@/types/continuousAnalysis';
import { AnalysisType, AnalysisResult, SafetyAnalysis } from '@/hooks/useImageAnalysis';
import { DbRule } from '@/types/rules';

export function useRuleEvaluation(cameraId: string, rules: DbRule[]) {
  const rulesRef = useRef<DbRule[]>(rules);

  useEffect(() => {
    rulesRef.current = rules;
  }, [rules]);

  const evaluateRules = useCallback(
    (analysis: AnalysisResult, _analysisType: AnalysisType): RuleEvaluation[] => {
      const evaluations: RuleEvaluation[] = [];
      const activeRules = rulesRef.current.filter(
        (r) => r.is_active && (r.cameras.length === 0 || r.cameras.includes(cameraId))
      );

      for (const rule of activeRules) {
        const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
        const conditionEvaluations: ConditionEvaluation[] = [];
        let allConditionsMet = true;

        for (const conditionRaw of conditions) {
          const condition = conditionRaw as Record<string, unknown>;
          let actualValue = 0;
          let satisfied = false;

          const conditionType = condition?.type as string | undefined;
          switch (conditionType) {
            case 'people_count':
            case 'crowd_density':
              actualValue = analysis.people_count || 0;
              break;
            case 'no_ppe':
              if ('ppe_compliance' in analysis) {
                actualValue = (analysis as SafetyAnalysis).ppe_compliance?.non_compliant || 0;
              }
              break;
          }

          const expectedValue = (condition?.value as number) || 0;
          const operator = condition?.operator as string | undefined;
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
            case 'between': {
              const value2 = (condition?.value2 as number) || 0;
              satisfied = actualValue >= expectedValue && actualValue <= value2;
              break;
            }
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
            severity: rule.severity as 'high' | 'low' | 'medium' | 'critical',
            message: `Regra "${rule.name}" violada: ${rule.description || 'Condições atendidas'}`,
          });
        }
      }

      return evaluations;
    },
    [cameraId]
  );

  return { evaluateRules };
}
