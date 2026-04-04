import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type DbRecordingConfig = Tables<'recording_configs'>;

export type RecordingConfig = DbRecordingConfig;
export type RecordingConfigInsert = TablesInsert<'recording_configs'>;
export type RecordingConfigUpdate = TablesUpdate<'recording_configs'>;

export const useRecordingConfigs = (cameraId?: string) => {
  const [configs, setConfigs] = useState<DbRecordingConfig[]>([]);
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

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
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
      const { data, error: insertError } = await supabase
        .from('recording_configs')
        .insert(config)
        .select()
        .single();

      if (insertError) throw insertError;
      await fetchConfigs();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create config');
      throw err;
    }
  }, [fetchConfigs]);

  const updateConfig = useCallback(async (id: string, updates: RecordingConfigUpdate) => {
    try {
      const { error: updateError } = await supabase
        .from('recording_configs')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update config');
      throw err;
    }
  }, [fetchConfigs]);

  const deleteConfig = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('recording_configs')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
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
