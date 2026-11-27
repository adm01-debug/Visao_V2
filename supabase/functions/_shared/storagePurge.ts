/**
 * Purga de objetos do Storage pertencentes a um titular (exclusão de conta / LGPD).
 *
 * Por que pela API e não por SQL: apagar linhas de `storage.objects` deixa o
 * binário órfão no backend do Storage. A API `remove()` é o caminho suportado.
 *
 * Layout real dos buckets do projeto (todos com o dono no primeiro nivel):
 *   - `avatars`           -> `{user_id}/avatar.{ext}`
 *   - `camera-clips`      -> `{user_id}/{camera_id}/{ts}_clip.webm` e `{ts}_thumb.jpg`
 *   - `camera-snapshots`  -> `{user_id}/{camera_id}/{ts}_{checksum}.jpg`
 *   - `camera-continuous` -> `{user_id}/{camera_id}/{ts}_{checksum}.mp4`
 *   - `site-plans`        -> `{user_id}/{uuid}.{ext}`
 *
 * Fica de fora: `faces` -> `faces/{arquivo}`, heap de imagens do
 * reconhecimento facial sem vinculo com o dono no caminho. Nao ha como
 * atribuir esses objetos a um titular por prefixo (ver Proximos passos).
 */

export interface StorageObjectEntry {
  name: string;
  id: string | null;
}

/** Client de UM bucket (`supabase.storage.from(bucket)`). */
export interface StorageBucketClientLike {
  list(
    prefix: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ data: StorageObjectEntry[] | null; error: { message: string } | null }>;
  remove(paths: string[]): Promise<{ error: { message: string } | null }>;
}

/** Client de Storage (`supabase.storage`), que resolve o bucket por `from`. */
export interface StorageClientLike {
  from(bucket: string): StorageBucketClientLike;
}

const PAGE = 1000;
const MAX_DEPTH = 3;

function isMissingBucket(message: string): boolean {
  return /bucket not found/i.test(message);
}

async function collectFolder(
  bucket: StorageBucketClientLike,
  prefix: string,
  depth: number,
  files: string[]
): Promise<void> {
  let offset = 0;
  for (;;) {
    const { data, error } = await bucket.list(prefix, { limit: PAGE, offset });
    if (error) {
      if (isMissingBucket(error.message)) return;
      throw new Error(`Falha ao listar ${prefix}: ${error.message}`);
    }
    const entries = data ?? [];
    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id === null) {
        if (depth < MAX_DEPTH) await collectFolder(bucket, path, depth + 1, files);
      } else {
        files.push(path);
      }
    }
    if (entries.length < PAGE) return;
    offset += PAGE;
  }
}

/**
 * Remove em lotes sem abortar no primeiro erro: um lote que falha nao impede os
 * lotes seguintes. A exclusao de conta precisa disso — o expurgo SQL ja rodou e
 * o acesso sai em seguida, entao abortar aqui so trocaria "arquivo orfao" por
 * "titular sem como repetir a limpeza".
 */
async function removeInBatchesTolerant(
  bucket: StorageBucketClientLike,
  paths: string[]
): Promise<{ removed: number; failed: string[]; errors: string[] }> {
  let removed = 0;
  const failed: string[] = [];
  const errors: string[] = [];
  for (let i = 0; i < paths.length; i += PAGE) {
    const batch = paths.slice(i, i + PAGE);
    const { error } = await bucket.remove(batch);
    if (error) {
      failed.push(...batch);
      errors.push(error.message);
    } else {
      removed += batch.length;
    }
  }
  return { removed, failed, errors };
}

async function removeInBatches(bucket: StorageBucketClientLike, paths: string[]): Promise<number> {
  const { removed, failed, errors } = await removeInBatchesTolerant(bucket, paths);
  if (failed.length > 0) throw new Error(`Falha ao remover objetos: ${errors[0]}`);
  return removed;
}

/** Coleta recursiva dos objetos sob `{userId}/` de um bucket. Nao remove nada. */
export async function collectUserStorage(
  bucket: StorageBucketClientLike,
  userId: string
): Promise<string[]> {
  const files: string[] = [];
  await collectFolder(bucket, userId, 0, files);
  return files;
}

/** Remove tudo sob `{userId}/` em um bucket (recursivo). Retorna quantos objetos saíram. */
export async function purgeUserStorage(
  bucket: StorageBucketClientLike,
  userId: string
): Promise<number> {
  const files = await collectUserStorage(bucket, userId);
  if (files.length === 0) return 0;
  return removeInBatches(bucket, files);
}

/**
 * Buckets que guardam arquivo do titular, todos com o dono no primeiro nivel
 * do caminho. Bucket que nao existir no projeto e ignorado (`isMissingBucket`),
 * entao incluir `camera-continuous` nao quebra projeto que nunca gravou video
 * continuo.
 */
export const USER_BUCKETS = [
  'avatars',
  'camera-clips',
  'camera-snapshots',
  'camera-continuous',
  'site-plans',
] as const;

/** Mapa bucket -> caminhos dos objetos do titular. */
export type UserStoragePaths = { [bucket: string]: string[] };

/**
 * Primeira metade da purga: apenas ENUMERA os objetos do titular.
 *
 * A exclusao de conta precisa desta separacao: o expurgo SQL apaga
 * `media_assets`/`site_plans`, que sao justamente quem guarda o caminho dos
 * binarios. Se o SQL rodar primeiro, os objetos ficam inalcancaveis. Por isso
 * enumeramos antes, removemos depois, e se o SQL falhar nada foi perdido ainda.
 */
export async function collectAllUserStorage(
  client: StorageClientLike,
  userId: string
): Promise<UserStoragePaths> {
  const result: UserStoragePaths = {};
  for (const bucket of USER_BUCKETS) {
    result[bucket] = await collectUserStorage(client.from(bucket), userId);
  }
  return result;
}

/** Falha parcial da purga: objetos que continuaram no bucket e o motivo. */
export interface StoragePurgeFailure {
  bucket: string;
  /** Caminhos que NAO foram confirmados como removidos. */
  paths: string[];
  message: string;
}

/** Resultado da purga: o que saiu, por bucket, e o que ficou para tras. */
export interface StoragePurgeResult {
  removed: { [bucket: string]: number };
  failures: StoragePurgeFailure[];
}

/**
 * Segunda metade da purga: remove os caminhos previamente enumerados.
 *
 * Cada bucket e cada lote falham de forma independente — uma falha em
 * `avatars` nao impede a tentativa em `camera-clips`. O que nao foi confirmado
 * volta em `failures` para a Edge Function registrar (o banco ja foi limpo e o
 * titular perde o acesso, entao ninguem vai poder reenumerar depois).
 */
export async function removeUserStoragePaths(
  client: StorageClientLike,
  paths: UserStoragePaths
): Promise<StoragePurgeResult> {
  const removed: { [bucket: string]: number } = {};
  const failures: StoragePurgeFailure[] = [];
  for (const bucket of USER_BUCKETS) {
    const files = paths[bucket] ?? [];
    if (files.length === 0) {
      removed[bucket] = 0;
      continue;
    }
    const result = await removeInBatchesTolerant(client.from(bucket), files);
    removed[bucket] = result.removed;
    if (result.failed.length > 0) {
      failures.push({ bucket, paths: result.failed, message: result.errors.join('; ') });
    }
  }
  return { removed, failures };
}

export async function purgeAllUserStorage(
  client: StorageClientLike,
  userId: string
): Promise<StoragePurgeResult> {
  return removeUserStoragePaths(client, await collectAllUserStorage(client, userId));
}
