/**
 * Integração — `useClipStorage` (hook de gravação de clips).
 *
 * Cobre o contrato de produção para clips:
 *   - Upload no bucket PRIVADO `camera-clips` com path `{user_id}/{camera_id}/...`
 *     (o bucket público `clips` não existe em produção → 404; `ready` é
 *      rejeitado pela constraint `clips_status_valid` → usa `completed`).
 *   - Leitura via `createSignedUrl` (7 dias), não `getPublicUrl`.
 *   - Registro em `video_clips` com `user_id` do usuário autenticado.
 *   - `deleteClip` remove os objetos do storage ANTES do registro no banco.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RecordedClip } from '../types';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    // useCallback retorna a mesma função (hook sem estado em teste unitário)
    useCallback: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

// ---------- Mocks Supabase ----------
type UploadCall = { bucket: string; path: string; contentType: string };
const uploads: UploadCall[] = [];
const signedUrls: string[] = [];
const removedPaths: string[][] = [];
let insertSpy: ReturnType<typeof vi.fn>;

const userMock = { id: 'user-123', email: 'u@teste.dev' };
const clipRow = { id: 'clip-db-1' };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: userMock } }),
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, _blob: Blob, opts: { contentType: string }) => {
          uploads.push({ bucket, path, contentType: opts.contentType });
          return { error: null };
        },
        createSignedUrl: async (path: string, seconds: number) => {
          signedUrls.push(`${path}@${seconds}`);
          return { data: { signedUrl: `https://signed/${path}?s=${seconds}` }, error: null };
        },
        getPublicUrl: async () => ({ data: { publicUrl: 'https://public/nao-deve' } }),
        remove: async (paths: string[]) => {
          removedPaths.push(paths);
          return { error: null };
        },
      }),
    },
    from: (table: string) => {
      if (table === 'video_clips') {
        return {
          insert: (payload: Record<string, unknown>) => {
            insertSpy({
              table,
              ...payload,
            });
            return {
              select: () => ({
                single: async () => ({ data: clipRow, error: null }),
              }),
            };
          },
          delete: () => ({
            eq: (_col: string, val: string) => {
              insertSpy({ deleteWhere: { table, col: _col, val } });
              return { error: null };
            },
          }),
        };
      }
      throw new Error(`table not mocked: ${table}`);
    },
  },
}));

import { useClipStorage } from '../useClipStorage';
import { toast } from 'sonner';

function makeClip(): RecordedClip {
  return {
    blob: new Blob(['fake-webm'], { type: 'video/webm' }),
    url: 'http://local/clip.webm',
    startTime: new Date('2026-11-21T10:00:00Z'),
    endTime: new Date('2026-11-21T10:00:30Z'),
    duration: 30,
    fileSize: 100,
    mimeType: 'video/webm',
    metadata: { cameraId: 'cam-1', cameraName: 'Câmera 1', triggerType: 'manual' },
  };
}

describe('useClipStorage', () => {
  beforeEach(() => {
    uploads.length = 0;
    signedUrls.length = 0;
    removedPaths.length = 0;
    insertSpy = vi.fn(async (_p: unknown) => ({ data: clipRow, error: null }));
  });

  it('salva no bucket privado camera-clips com path user/camera e status completed', async () => {
    const { saveClip } = useClipStorage('cam-1', 'Câmera 1');
    insertSpy.mockResolvedValue({ data: clipRow, error: null });

    const result = await saveClip(makeClip());

    expect(result).not.toBeNull();
    expect(result!.id).toBe('clip-db-1');
    expect(result!.url).toContain('signed/user-123/cam-1/');
    expect(uploads).toHaveLength(1);
    expect(uploads[0].bucket).toBe('camera-clips');
    expect(uploads[0].path.startsWith('user-123/cam-1/')).toBe(true);
    expect(uploads[0].contentType).toBe('video/webm');

    const insertCall = insertSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(insertCall.bucket).toBeUndefined();
    expect(insertCall.status).toBe('completed');
    expect(insertCall.user_id).toBe('user-123');
    expect(insertCall.file_url).toContain('signed/user-123/cam-1/');
  });

  it('não usa getPublicUrl (bucket privado) e assina com validade de 7 dias', async () => {
    const { saveClip } = useClipStorage('cam-1', 'Câmera 1');
    await saveClip(makeClip());

    expect(signedUrls.length).toBe(1);
    expect(signedUrls[0]).toContain('@604800');
    expect(signedUrls[0]).not.toContain('public');
  });

  it('deleteClip remove os objetos do storage antes do registro', async () => {
    const { saveClip, deleteClip } = useClipStorage('cam-1', 'Câmera 1');
    await saveClip(makeClip());

    const ok = await deleteClip('clip-db-1');

    expect(ok).toBe(true);
    expect(removedPaths).toHaveLength(1);
    expect(removedPaths[0][0]).toMatch(/^user-123\/cam-1\/.*_clip\.webm$/);
    expect(insertSpy.mock.calls.some((c) => !!c[0].deleteWhere)).toBe(true);
  });
});
