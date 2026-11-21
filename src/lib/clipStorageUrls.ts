/**
 * VISÃO - URLs de clips no storage privado (bucket `camera-clips`).
 *
 * Signed URLs expiram (7d) e `a.download` é ignorado para respostas
 * cross-origin. Estes helpers re-emitem URLs frescas a partir do path
 * embutido na URL salva e baixam via fetch -> Blob (download real).
 */
import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'camera-clips';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

export function extractStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = '/storage/v1/object/';
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const match = url.slice(index + marker.length).match(/^(sign|public)\/([^?]+)/);
  if (!match) return null;
  const rawPath = match[2];
  if (!rawPath) return null;
  // O SDK do Supabase monta signed/public URLs com o bucket na path
  // (`/object/sign/{bucket}/{path}`, `_getFinalPath` do storage-js). O objeto em
  // si vive sob `{bucket}/{path}:`, então `createSignedUrl`/`remove` devem
  // receber o path sem o bucket (o SDK re-insere o bucketId na solicitação).
  return rawPath.startsWith(`${BUCKET}/`) ? rawPath.slice(BUCKET.length + 1) : rawPath;
}

export async function refreshSignedUrl(url: string | null | undefined): Promise<string | null> {
  const path = extractStoragePath(url);
  if (!path) return url ?? null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return url ?? null; // degrada para URL antiga
  return data.signedUrl;
}

export async function refreshClipUrls(
  fileUrl: string | null | undefined,
  thumbnailUrl: string | null | undefined
): Promise<{ file_url: string | null; thumbnail_url: string | null }> {
  return {
    file_url: await refreshSignedUrl(fileUrl),
    thumbnail_url: await refreshSignedUrl(thumbnailUrl),
  };
}

async function tryFetch(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

export async function downloadUrl(
  url: string | null | undefined,
  filename: string
): Promise<boolean> {
  if (!url) return false;
  const isRemote = extractStoragePath(url) !== null;
  let blob = await tryFetch(url);
  if (!blob && isRemote) {
    const fresh = await refreshSignedUrl(url);
    if (!fresh) return false;
    blob = await tryFetch(fresh);
  }
  if (!blob) return false;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return true;
}

export async function removeClipStorageFiles(
  fileUrl: string | null | undefined,
  thumbnailUrl: string | null | undefined
): Promise<void> {
  const paths: string[] = [];
  const video = extractStoragePath(fileUrl);
  const thumb = extractStoragePath(thumbnailUrl);
  if (video) paths.push(video);
  if (thumb) paths.push(thumb);
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) throw error;
}
