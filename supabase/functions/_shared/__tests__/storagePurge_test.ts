import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  collectAllUserStorage,
  purgeUserStorage,
  purgeAllUserStorage,
  removeUserStoragePaths,
  USER_BUCKETS,
  type StorageBucketClientLike,
  type StorageClientLike,
  type StorageObjectEntry,
} from '../storagePurge.ts';

type Tree = Record<string, StorageObjectEntry[]>;
type Trees = Record<string, Tree>;

function bucketClient(
  tree: Tree,
  opts: { missingPrefixes?: string[] } = {}
): StorageBucketClientLike {
  return {
    list(prefix, options) {
      if ((opts.missingPrefixes ?? []).includes(prefix)) {
        return Promise.resolve({ data: null, error: { message: 'Bucket not found' } });
      }
      const entries = tree[prefix] ?? [];
      const offset = options?.offset ?? 0;
      const limit = options?.limit ?? 1000;
      return Promise.resolve({ data: entries.slice(offset, offset + limit), error: null });
    },
    remove(paths) {
      removed.push(...paths);
      return Promise.resolve({ error: null });
    },
  };
}

let removed: string[] = [];

function fakeClient(trees: Trees, opts: { missingPrefixes?: string[] } = {}): StorageClientLike {
  return {
    from: (bucket: string) => bucketClient(trees[bucket] ?? {}, opts),
  };
}

Deno.test('purgeUserStorage remove arquivo direto do avatar', async () => {
  removed = [];
  const client = bucketClient({ 'user-1': [{ name: 'avatar.png', id: 'obj-1' }] });
  assertEquals(await purgeUserStorage(client, 'user-1'), 1);
  assertEquals(removed, ['user-1/avatar.png']);
});

Deno.test('purgeUserStorage desce nas pastas de clipes por câmera', async () => {
  removed = [];
  const client = bucketClient({
    'user-1': [
      { name: 'cam-a', id: null },
      { name: 'cam-b', id: null },
    ],
    'user-1/cam-a': [
      { name: '1_clip.webm', id: 'v1' },
      { name: '1_thumb.jpg', id: 't1' },
    ],
    'user-1/cam-b': [{ name: '2_clip.webm', id: 'v2' }],
  });
  assertEquals(await purgeUserStorage(client, 'user-1'), 3);
  assertEquals(removed.sort(), [
    'user-1/cam-a/1_clip.webm',
    'user-1/cam-a/1_thumb.jpg',
    'user-1/cam-b/2_clip.webm',
  ]);
});

Deno.test('purgeUserStorage ignora pasta vazia', async () => {
  removed = [];
  const client = bucketClient({
    'user-1': [{ name: 'cam-a', id: null }],
    'user-1/cam-a': [],
  });
  assertEquals(await purgeUserStorage(client, 'user-1'), 0);
  assertEquals(removed, []);
});

Deno.test('purgeUserStorage trata bucket inexistente como vazio', async () => {
  removed = [];
  const client = bucketClient({}, { missingPrefixes: ['user-1'] });
  assertEquals(await purgeUserStorage(client, 'user-1'), 0);
  assertEquals(removed, []);
});

Deno.test('purgeUserStorage propaga erro real de listagem', async () => {
  const client: StorageBucketClientLike = {
    list: () => Promise.resolve({ data: null, error: { message: 'permission denied' } }),
    remove: () => Promise.resolve({ error: null }),
  };
  await assertRejects(() => purgeUserStorage(client, 'user-1'), Error, 'permission denied');
});

Deno.test('purgeUserStorage propaga erro real de remoção', async () => {
  const client: StorageBucketClientLike = {
    list: () => Promise.resolve({ data: [{ name: 'a.bin', id: 'x' }], error: null }),
    remove: () => Promise.resolve({ error: { message: 'network timeout' } }),
  };
  await assertRejects(() => purgeUserStorage(client, 'user-1'), Error, 'network timeout');
});

Deno.test('purgeUserStorage pagina além de 1000 objetos', async () => {
  removed = [];
  const entries = Array.from({ length: 1001 }, (_, i) => ({ name: `f${i}.bin`, id: `id-${i}` }));
  const client = bucketClient({ 'user-1': entries });
  assertEquals(await purgeUserStorage(client, 'user-1'), 1001);
  assertEquals(removed.length, 1001);
});

Deno.test('purgeAllUserStorage cobre avatar e clipes do bucket certo', async () => {
  removed = [];
  const client = fakeClient({
    avatars: { 'user-2': [{ name: 'avatar.png', id: 'obj-2' }] },
    'camera-clips': {
      'user-2': [{ name: 'cam-a', id: null }],
      'user-2/cam-a': [{ name: 'clip.webm', id: 'v' }],
    },
  });
  const res = await purgeAllUserStorage(client, 'user-2');
  assertEquals(res.avatars, 1);
  assertEquals(res['camera-clips'], 1);
  assertEquals(removed.sort(), ['user-2/avatar.png', 'user-2/cam-a/clip.webm']);
});

Deno.test('collectAllUserStorage enumera sem remover nada', async () => {
  removed = [];
  const client = fakeClient({
    avatars: { 'user-3': [{ name: 'avatar.png', id: 'a' }] },
    'camera-clips': {
      'user-3': [{ name: 'cam-a', id: null }],
      'user-3/cam-a': [{ name: 'clip.webm', id: 'v' }],
    },
    'camera-snapshots': {
      'user-3': [{ name: 'cam-a', id: null }],
      'user-3/cam-a': [{ name: '1_abc.jpg', id: 's' }],
    },
    'camera-continuous': {},
    'site-plans': { 'user-3': [{ name: 'planta.png', id: 'p' }] },
  });

  const paths = await collectAllUserStorage(client, 'user-3');

  // Enumerar nao pode apagar: a exclusao de conta faz o expurgo SQL entre as
  // duas metades, e se o SQL falhar os arquivos precisam continuar la.
  assertEquals(removed, []);
  assertEquals(paths.avatars, ['user-3/avatar.png']);
  assertEquals(paths['camera-clips'], ['user-3/cam-a/clip.webm']);
  assertEquals(paths['camera-snapshots'], ['user-3/cam-a/1_abc.jpg']);
  assertEquals(paths['camera-continuous'], []);
  assertEquals(paths['site-plans'], ['user-3/planta.png']);
});

Deno.test('removeUserStoragePaths remove exatamente o que foi enumerado', async () => {
  removed = [];
  const client = fakeClient({});
  const res = await removeUserStoragePaths(client, {
    avatars: ['user-4/avatar.png'],
    'site-plans': ['user-4/planta.png'],
  });
  assertEquals(res.avatars, 1);
  assertEquals(res['site-plans'], 1);
  assertEquals(res['camera-clips'], 0);
  assertEquals(removed.sort(), ['user-4/avatar.png', 'user-4/planta.png']);
});

Deno.test('USER_BUCKETS cobre todo bucket com o dono no primeiro nivel', () => {
  assertEquals(
    [...USER_BUCKETS],
    ['avatars', 'camera-clips', 'camera-snapshots', 'camera-continuous', 'site-plans']
  );
});
