/**
 * Unidade — `clipStorageUrls` (URLs de clips no storage privado).
 *
 * Cobre o contrato de produção para clips:
 *   - `extractStoragePath` extrai o path de signed URLs (`/sign/` e `/public/`)
 *     e tolera URLs sem o marcador (ex.: blob local de gravação em andamento).
 *   - `refreshSignedUrl`/`refreshClipUrls` re-emitem URL fresca (bucket
 *     `camera-clips`, TTL 7d) e DEGRADAM para a URL antiga se a re-emissão falhar
 *     (não quebra play/download com storage indisponível).
 *   - `downloadUrl` baixa via fetch -> Blob (resolve cross-origin `a.download`
 *     ignorado) e re-tenta com URL fresca quando a assinatura expirou.
 *   - `removeClipStorageFiles` remove os objetos do bucket pelos paths extraídos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------- Mocks Supabase ----------
const signedUrls: string[] = [];
const removedPaths: string[][] = [];
let signFn: (
  path: string,
  seconds: number
) => Promise<{ data: { signedUrl: string } | null; error: unknown }> = async (path, seconds) => ({
  data: { signedUrl: `https://signed/${path}?s=${seconds}` },
  error: null,
});
let removeError: unknown = null;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: (_bucket: string) => ({
        createSignedUrl: async (path: string, seconds: number) => {
          signedUrls.push(`${path}@${seconds}`);
          return signFn(path, seconds);
        },
        remove: async (paths: string[]) => {
          removedPaths.push(paths);
          return { error: removeError };
        },
      }),
    },
  },
}));

import {
  extractStoragePath,
  refreshClipUrls,
  downloadUrl,
  removeClipStorageFiles,
} from '../clipStorageUrls';

// URL no formato do banco (signed) e variantes
const SIGNED =
  'https://pmzxbffnbenkmzpnbehb.supabase.co/storage/v1/object/sign/cam-1/clip.webm?token=abc';
const SIGNED_THUMB =
  'https://pmzxbffnbenkmzpnbehb.supabase.co/storage/v1/object/sign/cam-1/thumb.jpg?token=def';
const PUBLIC = 'https://pmzxbffnbenkmzpnbehb.supabase.co/storage/v1/object/public/clips/x.mp4';
const LOCAL_BLOB = 'blob:http://localhost/clip-1';

describe('extractStoragePath', () => {
  it('extrai o path de signed URLs', () => {
    expect(extractStoragePath(SIGNED)).toBe('cam-1/clip.webm');
    expect(extractStoragePath(SIGNED_THUMB)).toBe('cam-1/thumb.jpg');
  });

  it('extrai o path de URLs públicas', () => {
    expect(extractStoragePath(PUBLIC)).toBe('clips/x.mp4');
  });

  it('retorna null para URL de blob local e vazio', () => {
    expect(extractStoragePath(LOCAL_BLOB)).toBeNull();
    expect(extractStoragePath(null)).toBeNull();
    expect(extractStoragePath('')).toBeNull();
  });

  it('ignora token/query na extração', () => {
    expect(extractStoragePath(`${SIGNED}&x=2?y=3`)).toBe('cam-1/clip.webm');
  });
});

describe('refreshClipUrls', () => {
  beforeEach(() => {
    signedUrls.length = 0;
    signFn = async (path, seconds) => ({
      data: { signedUrl: `https://signed/${path}?s=${seconds}` },
      error: null,
    });
  });

  it('re-emite file_url e thumbnail_url no bucket camera-clips com TTL 7d', async () => {
    const { file_url, thumbnail_url } = await refreshClipUrls(SIGNED, SIGNED_THUMB);

    expect(signedUrls).toEqual(['cam-1/clip.webm@604800', 'cam-1/thumb.jpg@604800']);
    expect(file_url).toContain('https://signed/cam-1/clip.webm');
    expect(thumbnail_url).toContain('https://signed/cam-1/thumb.jpg');
  });

  it('degrada para a URL antiga quando a re-emissão falha', async () => {
    signFn = async () => ({ data: null, error: new Error('boom') });

    const { file_url, thumbnail_url } = await refreshClipUrls(SIGNED, null);

    expect(file_url).toBe(SIGNED);
    expect(thumbnail_url).toBeNull();
  });

  it('não assina URLs sem path de storage (blob local)', async () => {
    const { file_url, thumbnail_url } = await refreshClipUrls(LOCAL_BLOB, null);

    expect(file_url).toBe(LOCAL_BLOB);
    expect(thumbnail_url).toBeNull();
    expect(signedUrls).toHaveLength(0);
  });
});

describe('downloadUrl', () => {
  it('baixa via fetch para Blob (cross-origin a.download ignorado)', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      blob: async () => new Blob(['webm'], { type: 'video/webm' }),
    }));
    const url = 'https://example.com/storage/v1/object/sign/cam-1/c.webm?token=t';
    const anchorHrefs: string[] = [];
    let clickInvocations = 0;
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'href', {
          configurable: true,
          get: () => anchorHrefs[anchorHrefs.length - 1],
          set: (v: string) => {
            anchorHrefs.push(v);
          },
        });
        el.click = () => {
          clickInvocations += 1;
        };
      }
      return el;
    });

    const ok = await downloadUrl(url, 'clip.webm');

    expect(ok).toBe(true);
    expect(clickInvocations).toBe(1);
    expect(anchorHrefs[0]).toMatch(/^blob:/);

    vi.restoreAllMocks();
  });

  it('retorna false para URL vazia ou download que falha', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: false }));

    expect(await downloadUrl(null, 'x.webm')).toBe(false);
    expect(await downloadUrl('https://example.com/v1/file.mp4', 'x.mp4')).toBe(false);

    vi.unstubAllGlobals();
  });
});

describe('removeClipStorageFiles', () => {
  beforeEach(() => {
    removedPaths.length = 0;
    removeError = null;
  });

  it('remove vídeo e miniatura a partir dos paths das URLs', async () => {
    await removeClipStorageFiles(SIGNED, SIGNED_THUMB);

    expect(removedPaths).toHaveLength(1);
    expect(removedPaths[0]).toEqual(['cam-1/clip.webm', 'cam-1/thumb.jpg']);
  });

  it('remove apenas o vídeo quando não há miniatura', async () => {
    await removeClipStorageFiles(SIGNED, null);

    expect(removedPaths[0]).toEqual(['cam-1/clip.webm']);
  });

  it('não chama o storage sem paths válidos', async () => {
    await removeClipStorageFiles(LOCAL_BLOB, 'https://cdn.example.com/x.jpg');

    expect(removedPaths).toHaveLength(0);
  });

  it('propaga erro do storage', async () => {
    removeError = new Error('storage down');

    await expect(removeClipStorageFiles(SIGNED, null)).rejects.toThrow('storage down');
  });
});
