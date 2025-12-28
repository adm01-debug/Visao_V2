/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Utility: batch
 * 
 * Processamento em lotes com controle de concorrência
 */

export interface BatchOptions<T, R> {
  batchSize?: number;
  concurrency?: number;
  delay?: number; // ms entre batches
  onBatchComplete?: (results: R[], batchIndex: number) => void;
  onBatchError?: (error: Error, batchIndex: number, items: T[]) => void;
  onProgress?: (completed: number, total: number) => void;
  retryOnError?: boolean;
  maxRetries?: number;
}

export interface BatchResult<R> {
  results: R[];
  errors: Array<{ index: number; error: Error }>;
  totalTime: number;
  successCount: number;
  errorCount: number;
}

/**
 * Processa array em lotes
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R> | R,
  options: BatchOptions<T, R> = {}
): Promise<BatchResult<R>> {
  const {
    batchSize = 10,
    concurrency = 3,
    delay = 0,
    onBatchComplete,
    onBatchError,
    onProgress,
    retryOnError = false,
    maxRetries = 3,
  } = options;

  const results: R[] = [];
  const errors: Array<{ index: number; error: Error }> = [];
  const startTime = Date.now();
  let completed = 0;

  // Dividir em batches
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // Processar batches com concorrência
  const activeBatches: Promise<void>[] = [];
  let batchIndex = 0;

  while (batchIndex < batches.length || activeBatches.length > 0) {
    // Iniciar novos batches até atingir concorrência
    while (activeBatches.length < concurrency && batchIndex < batches.length) {
      const currentBatch = batches[batchIndex];
      const currentIndex = batchIndex;
      const startItemIndex = currentIndex * batchSize;

      const batchPromise = processSingleBatch(
        currentBatch,
        processor,
        startItemIndex,
        retryOnError,
        maxRetries
      ).then((batchResults) => {
        for (let i = 0; i < batchResults.length; i++) {
          const result = batchResults[i];
          if (result.success) {
            results[startItemIndex + i] = result.value;
          } else {
            errors.push({ index: startItemIndex + i, error: result.error });
          }
        }
        completed += currentBatch.length;
        onBatchComplete?.(batchResults.map(r => r.value).filter(Boolean) as R[], currentIndex);
        onProgress?.(completed, items.length);
      }).catch((error) => {
        onBatchError?.(error as Error, currentIndex, currentBatch);
      }).finally(() => {
        const idx = activeBatches.indexOf(batchPromise);
        if (idx > -1) activeBatches.splice(idx, 1);
      });

      activeBatches.push(batchPromise);
      batchIndex++;
    }

    // Aguardar pelo menos um batch terminar
    if (activeBatches.length > 0) {
      await Promise.race(activeBatches);
      if (delay > 0) await sleep(delay);
    }
  }

  return {
    results,
    errors,
    totalTime: Date.now() - startTime,
    successCount: results.filter(r => r !== undefined).length,
    errorCount: errors.length,
  };
}

async function processSingleBatch<T, R>(
  batch: T[],
  processor: (item: T, index: number) => Promise<R> | R,
  startIndex: number,
  retryOnError: boolean,
  maxRetries: number
): Promise<Array<{ success: boolean; value: R; error: Error }>> {
  return Promise.all(
    batch.map(async (item, i) => {
      const globalIndex = startIndex + i;
      let attempts = 0;
      let lastError: Error;

      while (attempts <= (retryOnError ? maxRetries : 0)) {
        try {
          const value = await processor(item, globalIndex);
          return { success: true, value, error: null as unknown as Error };
        } catch (error) {
          lastError = error as Error;
          attempts++;
        }
      }

      return { success: false, value: null as unknown as R, error: lastError! };
    })
  );
}

/**
 * Processa com rate limiting
 */
export async function processWithRateLimit<T, R>(
  items: T[],
  processor: (item: T) => Promise<R> | R,
  ratePerSecond: number
): Promise<R[]> {
  const results: R[] = [];
  const delayMs = 1000 / ratePerSecond;

  for (const item of items) {
    const result = await processor(item);
    results.push(result);
    await sleep(delayMs);
  }

  return results;
}

/**
 * Processa em paralelo com limite
 */
export async function processParallel<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency = 5
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await processor(items[index]);
    }
  }

  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

/**
 * Divide array em chunks
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Processa iterável em batches
 */
export async function* batchIterator<T, R>(
  items: Iterable<T> | AsyncIterable<T>,
  processor: (batch: T[]) => Promise<R[]> | R[],
  batchSize = 10
): AsyncGenerator<R[], void, unknown> {
  let batch: T[] = [];

  for await (const item of items) {
    batch.push(item);
    if (batch.length >= batchSize) {
      yield await processor(batch);
      batch = [];
    }
  }

  if (batch.length > 0) {
    yield await processor(batch);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  processBatch,
  processWithRateLimit,
  processParallel,
  chunk,
  batchIterator,
};
