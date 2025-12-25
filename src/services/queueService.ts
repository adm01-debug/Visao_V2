type Task<T> = () => Promise<T>;
interface QueueItem<T> { task: Task<T>; resolve: (value: T) => void; reject: (error: any) => void; }

class QueueService {
  private queue: QueueItem<any>[] = [];
  private processing = false;
  private concurrency = 1;

  setConcurrency(n: number): void { this.concurrency = Math.max(1, n); }

  async add<T>(task: Task<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.concurrency);
      await Promise.all(batch.map(async ({ task, resolve, reject }) => {
        try { resolve(await task()); }
        catch (error) { reject(error); }
      }));
    }

    this.processing = false;
  }

  clear(): void { this.queue = []; }
  size(): number { return this.queue.length; }
  isProcessing(): boolean { return this.processing; }
}

export const queueService = new QueueService();
export default queueService;
