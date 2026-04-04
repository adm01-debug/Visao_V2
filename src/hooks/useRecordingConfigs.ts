import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RecordingConfig {
  id: string;
  camera_id: string;
  enabled: boolean;
  quality: 'low' | 'medium' | 'high' | 'original';
  format: 'webm' | 'mp4';
  max_duration_seconds: number;
  max_file_size_mb: number;
  retention_days: number;
  record_on_motion: boolean;
  record_on_alert: boolean;
  pre_buffer_seconds: number;
  post_buffer_seconds: number;
  created_at: string;
  updated_at: string;
}

export type RecordingConfigInsert = Omit<RecordingConfig, 'id' | 'created_at' | 'updated_at'>;
export type RecordingConfigUpdate = Partial<RecordingConfigInsert>;

export const useRecordingConfigs = (cameraId?: string) => {
  const [configs, setConfigs] = useState<RecordingConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('recording_configs')
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

  const createConfig = useCallback(async (config: RecordingConfigInsert) => {
    try {
      const { data, error } = await supabase
        .from('recording_configs')
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

  const updateConfig = useCallback(async (id: string, updates: RecordingConfigUpdate) => {
    try {
      const { error } = await supabase
        .from('recording_configs')
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
        .from('recording_configs')
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
