import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AnalysisConfig {
  id: string;
  camera_id: string;
  enabled: boolean;
  analysis_interval_ms: number;
  detection_types: string[];
  confidence_threshold: number;
  alert_on_detection: boolean;
  save_snapshots: boolean;
  max_detections_per_frame: number;
  created_at: string;
  updated_at: string;
}

export type AnalysisConfigInsert = Omit<AnalysisConfig, 'id' | 'created_at' | 'updated_at'>;
export type AnalysisConfigUpdate = Partial<AnalysisConfigInsert>;

// Note: This hook references a 'continuous_analysis_configs' table that may not exist yet.
// Using type assertions to allow compilation until the table is created.

export const useAnalysisConfigs = (cameraId?: string) => {
  const [configs, setConfigs] = useState<AnalysisConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('continuous_analysis_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (cameraId) {
        query = query.eq('camera_id', cameraId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setConfigs((data as AnalysisConfig[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch configs');
    } finally {
      setLoading(false);
    }
  }, [cameraId]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const createConfig = useCallback(async (config: AnalysisConfigInsert) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('continuous_analysis_configs')
        .insert(config)
        .select()
        .single();

      if (error) throw error;
      await fetchConfigs();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create config');
      throw err;
    }
  }, [fetchConfigs]);

  const updateConfig = useCallback(async (id: string, updates: AnalysisConfigUpdate) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('continuous_analysis_configs')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update config');
      throw err;
    }
  }, [fetchConfigs]);

  const deleteConfig = useCallback(async (id: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('continuous_analysis_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete config');
      throw err;
    }
  }, [fetchConfigs]);

  const toggleEnabled = useCallback(async (id: string, enabled: boolean) => {
    await updateConfig(id, { enabled });
  }, [updateConfig]);

  return {
    configs,
    loading,
    error,
    refetch: fetchConfigs,
    createConfig,
    updateConfig,
    deleteConfig,
    toggleEnabled,
  };
};
