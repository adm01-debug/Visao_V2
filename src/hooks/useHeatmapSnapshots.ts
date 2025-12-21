import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HeatmapSnapshot {
  id: string;
  camera_id: string;
  image_url: string;
  data_points: number;
  max_intensity: number;
  min_intensity: number;
  avg_intensity: number;
  period_start: string;
  period_end: string;
  resolution: {
    width: number;
    height: number;
  };
  metadata?: Record<string, any>;
  created_at: string;
}

export const useHeatmapSnapshots = (cameraId?: string) => {
  const [snapshots, setSnapshots] = useState<HeatmapSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('heatmap_snapshots')
        .select('*')
        .order('created_at', { ascending: false });

      if (cameraId) {
        query = query.eq('camera_id', cameraId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSnapshots(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch snapshots');
    } finally {
      setLoading(false);
    }
  }, [cameraId]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const saveSnapshot = useCallback(async (
    cameraId: string,
    imageBlob: Blob,
    stats: {
      dataPoints: number;
      maxIntensity: number;
      minIntensity: number;
      avgIntensity: number;
      periodStart: string;
      periodEnd: string;
      resolution: { width: number; height: number };
    },
    metadata?: Record<string, any>
  ) => {
    try {
      const fileName = `heatmaps/${cameraId}/${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('heatmap-snapshots')
        .upload(fileName, imageBlob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('heatmap-snapshots')
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from('heatmap_snapshots')
        .insert({
          camera_id: cameraId,
          image_url: urlData.publicUrl,
          data_points: stats.dataPoints,
          max_intensity: stats.maxIntensity,
          min_intensity: stats.minIntensity,
          avg_intensity: stats.avgIntensity,
          period_start: stats.periodStart,
          period_end: stats.periodEnd,
          resolution: stats.resolution,
          metadata,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchSnapshots();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save snapshot');
      throw err;
    }
  }, [fetchSnapshots]);

  const deleteSnapshot = useCallback(async (id: string) => {
    try {
      const snapshot = snapshots.find(s => s.id === id);
      if (snapshot?.image_url) {
        const path = snapshot.image_url.split('/').slice(-3).join('/');
        await supabase.storage.from('heatmap-snapshots').remove([path]);
      }

      const { error } = await supabase
        .from('heatmap_snapshots')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchSnapshots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete snapshot');
      throw err;
    }
  }, [fetchSnapshots, snapshots]);

  const getSnapshotsByPeriod = useCallback((startDate: Date, endDate: Date) => {
    return snapshots.filter(s => {
      const created = new Date(s.created_at);
      return created >= startDate && created <= endDate;
    });
  }, [snapshots]);

  return {
    snapshots,
    loading,
    error,
    refetch: fetchSnapshots,
    saveSnapshot,
    deleteSnapshot,
    getSnapshotsByPeriod,
  };
};
