/**
 * VISÃO - Clip Storage (Supabase upload/delete)
 *
 * Usa o bucket privado `camera-clips` com path `{user_id}/{camera_id}/...`
 * (padrão de produção das edges upload-media/resolve-media-url e do
 * useFirstSnapshot). URLs de leitura via createSignedUrl (privado/RLS).
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RecordedClip } from './types';

const BUCKET = 'camera-clips';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;
const storagePaths = new Map<string, { video: string; thumbnail?: string }>();

export function useClipStorage(cameraId: string, cameraName: string) {
  const saveClip = useCallback(
    async (
      clip: RecordedClip
    ): Promise<{ id: string; url: string; thumbnailUrl?: string } | null> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const ts = Date.now();
        const fileName = `${user.id}/${cameraId}/${ts}_clip.webm`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(fileName, clip.blob, { contentType: clip.mimeType, cacheControl: '3600' });
        if (uploadError) throw uploadError;

        const { data: urlData, error: urlErr } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(fileName, SIGNED_URL_TTL_SECONDS);
        if (urlErr) throw urlErr;
        if (!urlData?.signedUrl) throw new Error('no_signed_url');

        let thumbnailUrl: string | undefined;
        let thumbPath: string | undefined;
        if (clip.thumbnailBlob) {
          thumbPath = `${user.id}/${cameraId}/${ts}_thumb.jpg`;
          const { error: thumbError } = await supabase.storage
            .from(BUCKET)
            .upload(thumbPath, clip.thumbnailBlob, { contentType: 'image/jpeg' });
          if (!thumbError) {
            const { data: thumbUrlData, error: thumbUrlErr } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(thumbPath, SIGNED_URL_TTL_SECONDS);
            if (!thumbUrlErr && thumbUrlData?.signedUrl) thumbnailUrl = thumbUrlData.signedUrl;
          }
        }

        const { data: clipRecord, error: dbError } = await supabase
          .from('video_clips')
          .insert({
            camera_id: cameraId,
            user_id: user.id,
            start_time: clip.startTime.toISOString(),
            end_time: clip.endTime.toISOString(),
            duration: clip.duration,
            file_url: urlData.signedUrl,
            thumbnail_url: thumbnailUrl,
            status: 'completed',
          })
          .select()
          .single();
        if (dbError) throw dbError;

        storagePaths.set(clipRecord.id, { video: fileName, thumbnail: thumbPath });
        toast.success('Gravação salva');
        return { id: clipRecord.id, url: urlData.signedUrl, thumbnailUrl };
      } catch (_error) {
        toast.error('Erro ao salvar gravação');
        return null;
      }
    },
    [cameraId]
  );

  const deleteClip = useCallback(async (clipId: string): Promise<boolean> => {
    try {
      const paths = storagePaths.get(clipId);
      if (paths) {
        const { error: delErr } = await supabase.storage
          .from(BUCKET)
          .remove([paths.video, ...(paths.thumbnail ? [paths.thumbnail] : [])]);
        if (delErr) throw delErr;
        storagePaths.delete(clipId);
      }
      const { error } = await supabase.from('video_clips').delete().eq('id', clipId);
      if (error) throw error;
      toast.success('Gravação excluída');
      return true;
    } catch {
      toast.error('Erro ao excluir gravação');
      return false;
    }
  }, []);

  const downloadClip = useCallback(
    (clip: RecordedClip) => {
      const a = document.createElement('a');
      a.href = clip.url;
      a.download = `${cameraName}_${clip.startTime.toISOString().replace(/[:.]/g, '-')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Download iniciado');
    },
    [cameraName]
  );

  return { saveClip, deleteClip, downloadClip };
}
