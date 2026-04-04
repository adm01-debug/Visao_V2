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

export const useAnalysisConfigs = (cameraId?: string) => {
  const [configs, setConfigs] = useState<AnalysisConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('continuous_analysis_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (cameraId) {
        query = query.eq('camera_id', cameraId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setConfigs(data || []);
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
      const { data, error } = await supabase
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
      const { error } = await supabase
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
      const { error } = await supabase
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
