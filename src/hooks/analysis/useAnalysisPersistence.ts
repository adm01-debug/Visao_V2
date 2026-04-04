/**
 * Database persistence for analysis history and alerts.
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AnalysisHistoryEntry } from '@/types/continuousAnalysis';
import { AnalysisResult, AnalysisAlert } from '@/hooks/useImageAnalysis';

export function useAnalysisPersistence(
  cameraId: string,
  cameraName: string,
  createAlerts: boolean,
  saveToDatabase: boolean,
) {
  const createAlertInDatabase = useCallback(async (
    alert: AnalysisAlert,
    _analysis: AnalysisResult
  ) => {
    if (!createAlerts) return;
    try {
      await supabase.from('alerts').insert([{
        camera_name: cameraName,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        is_read: false,
      }]);
    } catch (_error) {
      // Silent fail for non-critical persistence
    }
  }, [createAlerts, cameraName]);

  const saveHistoryToDatabase = useCallback(async (entry: AnalysisHistoryEntry) => {
    if (!saveToDatabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('analysis_history').insert([{
        id: entry.id,
        camera_id: cameraId,
        user_id: user.id,
        timestamp: entry.timestamp.toISOString(),
        analysis_type: entry.analysisType,
        result: JSON.parse(JSON.stringify(entry.result)),
        confidence: 'confidence' in entry.result ? (entry.result as Record<string, number>).confidence : null,
        image_url: entry.snapshot || null,
      }]);
    } catch (_err) {
      // Silent fail for non-critical persistence
    }
  }, [saveToDatabase, cameraId]);

  return { createAlertInDatabase, saveHistoryToDatabase };
}
