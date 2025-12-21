import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CameraSnapshot {
  id: string;
  camera_id: string;
  image_url: string;
  thumbnail_url?: string;
  file_size_bytes: number;
  width: number;
  height: number;
  trigger_type: 'manual' | 'scheduled' | 'motion' | 'alert' | 'analysis';
  trigger_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export const useCameraSnapshots = (cameraId?: string) => {
  const [snapshots, setSnapshots] = useState<CameraSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('camera_snapshots')
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

  const captureSnapshot = useCallback(async (
    cameraId: string,
    imageBlob: Blob,
    triggerType: CameraSnapshot['trigger_type'] = 'manual',
    metadata?: Record<string, any>
  ) => {
    try {
      const fileName = `snapshots/${cameraId}/${Date.now()}.jpg`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('camera-snapshots')
        .upload(fileName, imageBlob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('camera-snapshots')
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from('camera_snapshots')
        .insert({
          camera_id: cameraId,
          image_url: urlData.publicUrl,
          file_size_bytes: imageBlob.size,
          width: 0,
          height: 0,
          trigger_type: triggerType,
          metadata,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchSnapshots();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture snapshot');
      throw err;
    }
  }, [fetchSnapshots]);

  const deleteSnapshot = useCallback(async (id: string) => {
    try {
      const snapshot = snapshots.find(s => s.id === id);
      if (snapshot?.image_url) {
        const path = snapshot.image_url.split('/').slice(-3).join('/');
        await supabase.storage.from('camera-snapshots').remove([path]);
      }

      const { error } = await supabase
        .from('camera_snapshots')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchSnapshots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete snapshot');
      throw err;
    }
  }, [fetchSnapshots, snapshots]);

  const deleteOldSnapshots = useCallback(async (olderThanDays: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      const { error } = await supabase
        .from('camera_snapshots')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) throw error;
      await fetchSnapshots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete old snapshots');
      throw err;
    }
  }, [fetchSnapshots]);

  return {
    snapshots,
    loading,
    error,
    refetch: fetchSnapshots,
    captureSnapshot,
    deleteSnapshot,
    deleteOldSnapshots,
  };
};
