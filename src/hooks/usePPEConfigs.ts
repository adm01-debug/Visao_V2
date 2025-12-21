import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PPEConfig {
  id: string;
  camera_id: string;
  enabled: boolean;
  required_items: string[];
  confidence_threshold: number;
  alert_on_violation: boolean;
  alert_delay_seconds: number;
  check_interval_ms: number;
  save_violation_images: boolean;
  notification_channels: string[];
  schedule?: {
    enabled: boolean;
    start_time: string;
    end_time: string;
    days: number[];
  };
  created_at: string;
  updated_at: string;
}

export type PPEConfigInsert = Omit<PPEConfig, 'id' | 'created_at' | 'updated_at'>;
export type PPEConfigUpdate = Partial<PPEConfigInsert>;

export const usePPEConfigs = (cameraId?: string) => {
  const [configs, setConfigs] = useState<PPEConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('ppe_configs')
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

  const createConfig = useCallback(async (config: PPEConfigInsert) => {
    try {
      const { data, error } = await supabase
        .from('ppe_configs')
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

  const updateConfig = useCallback(async (id: string, updates: PPEConfigUpdate) => {
    try {
      const { error } = await supabase
        .from('ppe_configs')
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
        .from('ppe_configs')
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

  const setRequiredItems = useCallback(async (id: string, items: string[]) => {
    await updateConfig(id, { required_items: items });
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
    setRequiredItems,
  };
};
