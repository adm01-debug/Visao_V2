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

type BucketOpts = { missingPrefixes?: string[]; failRemove?: boolean };

function bucketClient(tree: Tree, opts: BucketOpts = {}): StorageBucketClientLike {
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
      if (opts.failRemove) {
        return Promise.resolve({ error: { message: 'falha simulada' } });
      }
      removed.push(...paths);
      return Promise.resolve({ error: null });
    },
  };
}

let removed: string[] = [];

function fakeClient(
  trees: Trees,
  opts: BucketOpts = {},
  failRemoveBuckets: string[] = []
): StorageClientLike {
  return {
    from: (bucket: string) =>
      bucketClient(trees[bucket] ?? {}, {
        ...opts,
        failRemove: opts.failRemove === true || failRemoveBuckets.includes(bucket),
      }),
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
  assertEquals(res.removed.avatars, 1);
  assertEquals(res.removed['camera-clips'], 1);
  assertEquals(res.failures, []);
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
  assertEquals(res.removed.avatars, 1);
  assertEquals(res.removed['site-plans'], 1);
  assertEquals(res.removed['camera-clips'], 0);
  assertEquals(res.failures, []);
  assertEquals(removed.sort(), ['user-4/avatar.png', 'user-4/planta.png']);
});

Deno.test('removeUserStoragePaths continua nos demais buckets quando um falha', async () => {
  removed = [];
  const client = fakeClient({}, {}, ['avatars']);
  const res = await removeUserStoragePaths(client, {
    avatars: ['user-5/avatar.png'],
    'site-plans': ['user-5/planta.png'],
  });

  // O bucket que falhou nao impediu a tentativa no seguinte.
  assertEquals(res.removed['site-plans'], 1);
  assertEquals(removed, ['user-5/planta.png']);
  assertEquals(res.failures, [
    { bucket: 'avatars', paths: ['user-5/avatar.png'], message: 'falha simulada' },
  ]);
});

Deno.test('removeUserStoragePaths segue para o lote seguinte quando um lote falha', async () => {
  removed = [];
  const client = fakeClient({}, {}, ['avatars']);
  const files = Array.from({ length: 1500 }, (_, i) => `user-6/f${i}.bin`);
  const res = await removeUserStoragePaths(client, { avatars: files });

  assertEquals(res.removed.avatars, 0);
  assertEquals(res.failures[0].paths.length, 1500);
  assertEquals(res.failures[0].bucket, 'avatars');
});

Deno.test('removeUserStoragePaths conta so o lote que falhou e apaga o resto', async () => {
  removed = [];
  // Falha apenas na PRIMEIRA chamada de remove: o segundo lote do mesmo bucket
  // precisa ser apagado e nao pode aparecer na lista de residuos — senao o
  // relatorio de exclusao de conta mente dizendo que 1500 arquivos ficaram.
  let chamadas = 0;
  const client: StorageClientLike = {
    from: () => ({
      list: () => Promise.resolve({ data: [], error: null }),
      remove: (paths: string[]) => {
        chamadas += 1;
        if (chamadas === 1) return Promise.resolve({ error: { message: 'falha simulada' } });
        removed.push(...paths);
        return Promise.resolve({ error: null });
      },
    }),
  };
  const files = Array.from({ length: 1500 }, (_, i) => `user-7/f${i}.bin`);
  const res = await removeUserStoragePaths(client, { avatars: files });

  assertEquals(res.removed.avatars, 500);
  assertEquals(res.failures.length, 1);
  assertEquals(res.failures[0].paths, files.slice(0, 1000));
  assertEquals(removed, files.slice(1000));
});

Deno.test('USER_BUCKETS cobre todo bucket com o dono no primeiro nivel', () => {
  assertEquals(
    [...USER_BUCKETS],
    ['avatars', 'camera-clips', 'camera-snapshots', 'camera-continuous', 'site-plans']
  );
});
