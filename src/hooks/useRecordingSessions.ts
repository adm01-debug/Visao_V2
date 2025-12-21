import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RecordingSession {
  id: string;
  camera_id: string;
  config_id: string;
  status: 'recording' | 'paused' | 'stopped' | 'error';
  started_at: string;
  ended_at?: string;
  trigger_type: 'manual' | 'motion' | 'alert' | 'scheduled';
  trigger_id?: string;
  total_clips: number;
  total_size_bytes: number;
  error_message?: string;
  created_at: string;
}

export const useRecordingSessions = (cameraId?: string) => {
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [activeSession, setActiveSession] = useState<RecordingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('recording_sessions')
        .select('*')
        .order('started_at', { ascending: false });

      if (cameraId) {
        query = query.eq('camera_id', cameraId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setSessions(data || []);
      setActiveSession(data?.find(s => s.status === 'recording') || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  }, [cameraId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const startSession = useCallback(async (cameraId: string, configId: string, triggerType: RecordingSession['trigger_type']) => {
    try {
      const { data, error } = await supabase
        .from('recording_sessions')
        .insert({
          camera_id: cameraId,
          config_id: configId,
          status: 'recording',
          trigger_type: triggerType,
          started_at: new Date().toISOString(),
          total_clips: 0,
          total_size_bytes: 0,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchSessions();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
      throw err;
    }
  }, [fetchSessions]);

  const stopSession = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('recording_sessions')
        .update({
          status: 'stopped',
          ended_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop session');
      throw err;
    }
  }, [fetchSessions]);

  const pauseSession = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('recording_sessions')
        .update({ status: 'paused' })
        .eq('id', id);

      if (error) throw error;
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause session');
      throw err;
    }
  }, [fetchSessions]);

  const resumeSession = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('recording_sessions')
        .update({ status: 'recording' })
        .eq('id', id);

      if (error) throw error;
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume session');
      throw err;
    }
  }, [fetchSessions]);

  return {
    sessions,
    activeSession,
    loading,
    error,
    refetch: fetchSessions,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
  };
};
