/**
 * Batch Processing Utility
 */
export async function processBatch<T, R>(items: T[], processor: (item: T) => Promise<R>, options?: { batchSize?: number; concurrency?: number; onProgress?: (done: number, total: number) => void }): Promise<R[]> {
  const { batchSize = 10, concurrency = 3, onProgress } = options || {};
  const results: R[] = [];
  let done = 0;
  for (let i = 0; i < items.length; i += batchSize * concurrency) {
    const chunk = items.slice(i, i + batchSize * concurrency);
    const batches: T[][] = [];
    for (let j = 0; j < chunk.length; j += batchSize) batches.push(chunk.slice(j, j + batchSize));
    const batchResults = await Promise.all(batches.map(batch => Promise.all(batch.map(processor))));
    batchResults.flat().forEach(r => results.push(r));
    done += chunk.length;
    onProgress?.(done, items.length);
  }
  return results;
}
