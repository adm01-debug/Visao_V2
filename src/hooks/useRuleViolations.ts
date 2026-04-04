import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RuleViolation {
  id: string;
  rule_id: string;
  camera_id: string;
  violation_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  snapshot_url?: string;
  metadata?: Record<string, any>;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
}

export const useRuleViolations = (ruleId?: string, cameraId?: string) => {
  const [violations, setViolations] = useState<RuleViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('rule_violations')
        .select('*')
        .order('created_at', { ascending: false });

      if (ruleId) {
        query = query.eq('rule_id', ruleId);
      }
      if (cameraId) {
        query = query.eq('camera_id', cameraId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setViolations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch violations');
    } finally {
      setLoading(false);
    }
  }, [ruleId, cameraId]);

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  const acknowledgeViolation = useCallback(async (id: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('rule_violations')
        .update({
          acknowledged: true,
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      await fetchViolations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge violation');
      throw err;
    }
  }, [fetchViolations]);

  const deleteViolation = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('rule_violations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchViolations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete violation');
      throw err;
    }
  }, [fetchViolations]);

  const getStats = useCallback(() => {
    const total = violations.length;
    const unacknowledged = violations.filter(v => !v.acknowledged).length;
    const bySeverity = {
      critical: violations.filter(v => v.severity === 'critical').length,
      high: violations.filter(v => v.severity === 'high').length,
      medium: violations.filter(v => v.severity === 'medium').length,
      low: violations.filter(v => v.severity === 'low').length,
    };

    return { total, unacknowledged, bySeverity };
  }, [violations]);

  return {
    violations,
    loading,
    error,
    refetch: fetchViolations,
    acknowledgeViolation,
    deleteViolation,
    getStats,
  };
};
