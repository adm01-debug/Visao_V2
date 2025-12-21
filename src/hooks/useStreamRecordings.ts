import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StreamRecording {
  id: string;
  camera_id: string;
  stream_url: string;
  file_path: string;
  file_size_bytes: number;
  duration_seconds: number;
  format: string;
  quality: string;
  started_at: string;
  ended_at: string;
  status: 'recording' | 'completed' | 'failed' | 'processing';
  error_message?: string;
  thumbnail_url?: string;
  created_at: string;
}

export const useStreamRecordings = (cameraId?: string) => {
  const [recordings, setRecordings] = useState<StreamRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('stream_recordings')
        .select('*')
        .order('started_at', { ascending: false });

      if (cameraId) {
        query = query.eq('camera_id', cameraId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecordings(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recordings');
    } finally {
      setLoading(false);
    }
  }, [cameraId]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const deleteRecording = useCallback(async (id: string) => {
    try {
      const recording = recordings.find(r => r.id === id);
      if (recording?.file_path) {
        await supabase.storage
          .from('recordings')
          .remove([recording.file_path]);
      }

      const { error } = await supabase
        .from('stream_recordings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchRecordings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recording');
      throw err;
    }
  }, [fetchRecordings, recordings]);

  const getDownloadUrl = useCallback(async (filePath: string) => {
    const { data } = supabase.storage
      .from('recordings')
      .getPublicUrl(filePath);
    return data.publicUrl;
  }, []);

  const getTotalSize = useCallback(() => {
    return recordings.reduce((sum, r) => sum + (r.file_size_bytes || 0), 0);
  }, [recordings]);

  const getTotalDuration = useCallback(() => {
    return recordings.reduce((sum, r) => sum + (r.duration_seconds || 0), 0);
  }, [recordings]);

  return {
    recordings,
    loading,
    error,
    refetch: fetchRecordings,
    deleteRecording,
    getDownloadUrl,
    getTotalSize,
    getTotalDuration,
  };
};
