/**
 * VISÃO - Clip Storage (Supabase upload/delete)
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RecordedClip } from './types';

export function useClipStorage(cameraId: string, cameraName: string) {
  const saveClip = useCallback(async (clip: RecordedClip): Promise<string | null> => {
    try {
      const fileName = `${cameraId}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('video-clips')
        .upload(fileName, clip.blob, { contentType: clip.mimeType, cacheControl: '3600' });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('video-clips').getPublicUrl(fileName);

      let thumbnailUrl: string | undefined;
      if (clip.thumbnailBlob) {
        const thumbName = `${cameraId}/thumb_${Date.now()}.jpg`;
        const { error: thumbError } = await supabase.storage
          .from('video-clips')
          .upload(thumbName, clip.thumbnailBlob, { contentType: 'image/jpeg' });
        if (!thumbError) {
          const { data: thumbUrlData } = supabase.storage.from('video-clips').getPublicUrl(thumbName);
          thumbnailUrl = thumbUrlData?.publicUrl;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: clipRecord, error: dbError } = await supabase
        .from('video_clips')
        .insert({
          camera_id: cameraId, user_id: user.id,
          start_time: clip.startTime.toISOString(), end_time: clip.endTime.toISOString(),
          duration: clip.duration, file_url: urlData?.publicUrl,
          thumbnail_url: thumbnailUrl, status: 'completed',
        })
        .select().single();
      if (dbError) throw dbError;

      toast.success('Gravação salva');
      return clipRecord.id;
    } catch (error) {
      toast.error('Erro ao salvar gravação');
      return null;
    }
  }, [cameraId]);

  const deleteClip = useCallback(async (clipId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('video_clips').delete().eq('id', clipId);
      if (error) throw error;
      toast.success('Gravação excluída');
      return true;
    } catch {
      toast.error('Erro ao excluir gravação');
      return false;
    }
  }, []);

  const downloadClip = useCallback((clip: RecordedClip) => {
    const a = document.createElement('a');
    a.href = clip.url;
    a.download = `${cameraName}_${clip.startTime.toISOString().replace(/[:.]/g, '-')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Download iniciado');
  }, [cameraName]);

  return { saveClip, deleteClip, downloadClip };
}
