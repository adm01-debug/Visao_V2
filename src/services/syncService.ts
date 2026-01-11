type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';
type SyncCallback = (status: SyncStatus) => void;

class SyncService {
  private status: SyncStatus = 'idle';
  private listeners: SyncCallback[] = [];
  private queue: (() => Promise<void>)[] = [];
  private syncing = false;

  getStatus(): SyncStatus { return this.status; }

  subscribe(callback: SyncCallback): () => void {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  }

  private setStatus(status: SyncStatus): void {
    this.status = status;
    this.listeners.forEach(l => l(status));
  }

  async sync(operation: () => Promise<void>): Promise<void> {
    this.queue.push(operation);
    if (!this.syncing) await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.syncing || this.queue.length === 0) return;
    
    this.syncing = true;
    this.setStatus('syncing');

    while (this.queue.length > 0) {
      const operation = this.queue.shift()!;
      try {
        await operation();
      } catch (error) {
        this.setStatus('error');
}
    }

    this.syncing = false;
    this.setStatus('synced');
  }

  async forcSync(): Promise<void> {
    await this.processQueue();
  }

  clear(): void {
    this.queue = [];
    this.setStatus('idle');
  }
}

export const syncService = new SyncService();
export default syncService;
