/**
 * Connection Pool
 */
export class ConnectionPool<T> {
  private pool: T[] = [];
  private inUse = new Set<T>();
  constructor(private factory: () => Promise<T>, private maxSize = 5, private minSize = 1) { this.initialize(); }
  private async initialize(): Promise<void> { for (let i = 0; i < this.minSize; i++) this.pool.push(await this.factory()); }
  async acquire(): Promise<T> {
    if (this.pool.length > 0) { const conn = this.pool.pop()!; this.inUse.add(conn); return conn; }
    if (this.inUse.size < this.maxSize) { const conn = await this.factory(); this.inUse.add(conn); return conn; }
    return new Promise(r => setTimeout(() => r(this.acquire()), 100));
  }
  release(conn: T): void { this.inUse.delete(conn); if (this.pool.length < this.maxSize) this.pool.push(conn); }
  get stats() { return { available: this.pool.length, inUse: this.inUse.size }; }
}
