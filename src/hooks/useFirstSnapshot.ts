/**
 * VISÃO — useFirstSnapshot
 * Captura client-side do primeiro frame de uma câmera recém-cadastrada.
 *
 * Estratégia:
 *  - Requer uma URL HLS pública (stream_url ou substream_url).
 *  - Cria <video> off-DOM com hls.js (lazy), aguarda `loadeddata`, desenha
 *    no <canvas> e envia JPEG para a Edge Function `upload-media`.
 *  - Atualiza `public.cameras.thumbnail` com a URL pública do bucket.
 *
 * NÃO chama `resolve-camera-url` (service_role only). Se a câmera só possui
 * RTSP no cofre e nenhum HLS público, retorna `{ status: 'pending' }` para
 * que a UI mostre "snapshot ficará disponível quando o stream público
 * estiver ingerido".
 */
import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getHls } from '@/lib/lazyHls';

export type SnapshotStatus = 'idle' | 'capturing' | 'done' | 'failed' | 'pending';

export interface CaptureArgs {
  cameraId: string;
  hlsUrl?: string | null;
  fallbackHlsUrl?: string | null;
  timeoutMs?: number;
}

export interface CaptureResult {
  status: SnapshotStatus;
  publicUrl?: string;
  reason?: string;
}

const BUCKET = 'camera-snapshots';

function isHls(url: string | null | undefined): url is string {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.startsWith('http') && (u.includes('.m3u8') || u.includes('/hls/'));
}

async function grabFrame(url: string, timeoutMs: number): Promise<Blob> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.preload = 'auto';
  video.style.position = 'fixed';
  video.style.left = '-9999px';
  video.style.width = '1px';
  video.style.height = '1px';
  document.body.appendChild(video);

  let hls: {
    destroy: () => void;
    loadSource: (u: string) => void;
    attachMedia: (v: HTMLVideoElement) => void;
  } | null = null;

  const cleanup = () => {
    try {
      hls?.destroy();
    } catch {
      /* noop */
    }
    try {
      video.pause();
    } catch {
      /* noop */
    }
    video.removeAttribute('src');
    video.load();
    video.remove();
  };

  try {
    const useNative = video.canPlayType('application/vnd.apple.mpegurl');
    if (useNative) {
      video.src = url;
    } else {
      const Hls = await getHls();
      if (!Hls.isSupported()) throw new Error('hls_unsupported');
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(url);
      hls.attachMedia(video);
    }

    await new Promise<void>((resolve, reject) => {
      const t = window.setTimeout(() => reject(new Error('timeout')), timeoutMs);
      const onData = () => {
        window.clearTimeout(t);
        resolve();
      };
      const onErr = () => {
        window.clearTimeout(t);
        reject(new Error('video_error'));
      };
      video.addEventListener('loadeddata', onData, { once: true });
      video.addEventListener('error', onErr, { once: true });
    });

    try {
      await video.play();
    } catch {
      /* autoplay pode ser bloqueado; frame ainda desenhável */
    }

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 360;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no_canvas_ctx');
    ctx.drawImage(video, 0, 0, w, h);

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('blob_null'))), 'image/jpeg', 0.85);
    });
    return blob;
  } finally {
    cleanup();
  }
}

async function uploadSnapshot(cameraId: string, blob: Blob): Promise<string> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error('no_session');

  const file = new File([blob], 'first.jpg', { type: 'image/jpeg' });
  const form = new FormData();
  form.append('file', file);
  form.append('type', 'snapshot');
  form.append('camera_id', cameraId);
  form.append('captured_at', new Date().toISOString());

  const { data, error } = await supabase.functions.invoke('upload-media', { body: form });
  if (error) throw new Error(error.message || 'upload_failed');
  const objectKey = (data as { object_key?: string } | null)?.object_key;
  if (!objectKey) throw new Error('no_object_key');

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectKey);
  if (pub?.publicUrl) return pub.publicUrl;

  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(objectKey, 60 * 60 * 24 * 7);
  if (signErr || !signed?.signedUrl) throw new Error('url_unavailable');
  return signed.signedUrl;
}

export function useFirstSnapshot() {
  const [status, setStatus] = useState<SnapshotStatus>('idle');
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async (args: CaptureArgs): Promise<CaptureResult> => {
    setError(null);
    setPublicUrl(null);

    const candidates = [args.hlsUrl, args.fallbackHlsUrl].filter(isHls);
    if (candidates.length === 0) {
      setStatus('pending');
      return { status: 'pending', reason: 'no_public_hls' };
    }

    setStatus('capturing');
    const timeoutMs = args.timeoutMs ?? 12_000;
    let lastErr: unknown = null;

    for (const url of candidates) {
      try {
        const blob = await grabFrame(url, timeoutMs);
        const uploadedUrl = await uploadSnapshot(args.cameraId, blob);

        const { error: updErr } = await supabase
          .from('cameras')
          .update({ thumbnail: uploadedUrl })
          .eq('id', args.cameraId);
        if (updErr) throw new Error(updErr.message);

        setStatus('done');
        setPublicUrl(uploadedUrl);
        return { status: 'done', publicUrl: uploadedUrl };
      } catch (e) {
        lastErr = e;
      }
    }

    const msg = lastErr instanceof Error ? lastErr.message : 'unknown';
    setStatus('failed');
    setError(msg);
    return { status: 'failed', reason: msg };
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setPublicUrl(null);
    setError(null);
  }, []);

  return { capture, reset, status, publicUrl, error };
}
