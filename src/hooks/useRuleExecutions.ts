/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook para gerenciar histórico de execuções de regras
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RuleExecution {
  id: string;
  rule_id: string;
  user_id: string;
  alert_id: string | null;
  triggered_at: string;
  actions_executed: string[];
  status: 'success' | 'error' | 'partial';
  error_message: string | null;
  execution_time_ms: number | null;
  created_at: string;
  // Joined data
  rule?: {
    name: string;
    category: string;
    severity: string;
  };
  alert?: {
    message: string;
    camera_name: string;
  };
}

export function useRuleExecutions(ruleId?: string) {
  const { data: executions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['rule-executions', ruleId],
    queryFn: async () => {
      let query = supabase
        .from('rule_executions')
        .select(`
          *,
          rule:rules(name, category, severity),
          alert:alerts(message, camera_name)
        `)
        .order('triggered_at', { ascending: false })
        .limit(100);
      
      if (ruleId) {
        query = query.eq('rule_id', ruleId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as RuleExecution[];
    },
  });

  const getExecutionsByRule = (ruleId: string) => {
    return executions.filter(e => e.rule_id === ruleId);
  };

  const getRecentExecutions = (limit: number = 10) => {
    return executions.slice(0, limit);
  };

  const getStats = () => {
    const total = executions.length;
    const success = executions.filter(e => e.status === 'success').length;
    const errors = executions.filter(e => e.status === 'error').length;
    const avgTime = executions.reduce((acc, e) => acc + (e.execution_time_ms || 0), 0) / (total || 1);
    
    return { total, success, errors, avgTime: Math.round(avgTime) };
  };

  return {
    executions,
    loading: isLoading,
    error,
    refetch,
    getExecutionsByRule,
    getRecentExecutions,
    getStats,
  };
}
