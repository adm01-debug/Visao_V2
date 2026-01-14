import { logger } from '@/lib/logger';
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook para gerenciar gravações de vídeo
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Recording {
  id: string;
  camera_id: string | null;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  file_url: string | null;
  thumbnail_url: string | null;
  status: 'recording' | 'completed' | 'failed' | 'processing';
  created_at: string;
}

export interface UseRecordingsReturn {
  recordings: Recording[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  startRecording: (cameraId: string) => Promise<Recording | null>;
  stopRecording: (recordingId: string) => Promise<void>;
  deleteRecording: (recordingId: string) => Promise<void>;
  getByCamera: (cameraId: string) => Recording[];
  getByDateRange: (startDate: Date, endDate: Date) => Recording[];
  getActiveRecordings: () => Recording[];
}

export const useRecordings = (cameraId?: string): UseRecordingsReturn => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchRecordings = useCallback(async () => {
    if (!user) {
      setRecordings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('video_clips')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });

      if (cameraId) {
        query = query.eq('camera_id', cameraId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Map video_clips to Recording interface
      const mappedRecordings: Recording[] = (data || []).map((clip) => ({
        id: clip.id,
        camera_id: clip.camera_id,
        user_id: clip.user_id,
        start_time: clip.start_time,
        end_time: clip.end_time,
        duration: clip.duration,
        file_url: clip.file_url,
        thumbnail_url: clip.thumbnail_url,
        status: clip.status as Recording['status'],
        created_at: clip.created_at,
      }));

      setRecordings(mappedRecordings);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao buscar gravações';
      setError(message);
      logger.error('recordings',('useRecordings fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, cameraId]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const startRecording = useCallback(async (targetCameraId: string): Promise<Recording | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('video_clips')
        .insert({
          camera_id: targetCameraId,
          user_id: user.id,
          start_time: new Date().toISOString(),
          status: 'recording',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newRecording: Recording = {
        id: data.id,
        camera_id: data.camera_id,
        user_id: data.user_id,
        start_time: data.start_time,
        end_time: data.end_time,
        duration: data.duration,
        file_url: data.file_url,
        thumbnail_url: data.thumbnail_url,
        status: data.status as Recording['status'],
        created_at: data.created_at,
      };

      setRecordings(prev => [newRecording, ...prev]);
      return newRecording;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao iniciar gravação';
      setError(message);
      logger.error('recordings',('startRecording error:', err);
      return null;
    }
  }, [user]);

  const stopRecording = useCallback(async (recordingId: string): Promise<void> => {
    try {
      const endTime = new Date().toISOString();
      const recording = recordings.find(r => r.id === recordingId);
      
      let duration: number | null = null;
      if (recording) {
        const start = new Date(recording.start_time).getTime();
        const end = new Date(endTime).getTime();
        duration = Math.round((end - start) / 1000);
      }

      const { error: updateError } = await supabase
        .from('video_clips')
        .update({
          end_time: endTime,
          duration,
          status: 'completed',
        })
        .eq('id', recordingId);

      if (updateError) throw updateError;

      setRecordings(prev =>
        prev.map(r =>
          r.id === recordingId
            ? { ...r, end_time: endTime, duration, status: 'completed' as const }
            : r
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao parar gravação';
      setError(message);
      logger.error('recordings',('stopRecording error:', err);
      throw err;
    }
  }, [recordings]);

  const deleteRecording = useCallback(async (recordingId: string): Promise<void> => {
    try {
      const recording = recordings.find(r => r.id === recordingId);

      // Delete file from storage if exists
      if (recording?.file_url) {
        const filePath = recording.file_url.split('/').pop();
        if (filePath) {
          await supabase.storage.from('recordings').remove([filePath]);
        }
      }

      const { error: deleteError } = await supabase
        .from('video_clips')
        .delete()
        .eq('id', recordingId);

      if (deleteError) throw deleteError;

      setRecordings(prev => prev.filter(r => r.id !== recordingId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao deletar gravação';
      setError(message);
      logger.error('recordings',('deleteRecording error:', err);
      throw err;
    }
  }, [recordings]);

  const getByCamera = useCallback((targetCameraId: string): Recording[] => {
    return recordings.filter(r => r.camera_id === targetCameraId);
  }, [recordings]);

  const getByDateRange = useCallback((startDate: Date, endDate: Date): Recording[] => {
    return recordings.filter(r => {
      const recordingDate = new Date(r.start_time);
      return recordingDate >= startDate && recordingDate <= endDate;
    });
  }, [recordings]);

  const getActiveRecordings = useCallback((): Recording[] => {
    return recordings.filter(r => r.status === 'recording');
  }, [recordings]);

  return {
    recordings,
    loading,
    error,
    refetch: fetchRecordings,
    startRecording,
    stopRecording,
    deleteRecording,
    getByCamera,
    getByDateRange,
    getActiveRecordings,
  };
};

export default useRecordings;
