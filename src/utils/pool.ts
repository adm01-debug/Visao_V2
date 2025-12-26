/**
 * Resource Pool Utility
 */
export class Pool<T> {
  private available: T[] = [];
  private inUse = new Set<T>();
  constructor(private factory: () => T | Promise<T>, private maxSize = 10) {}
  async acquire(): Promise<T> {
    if (this.available.length > 0) { const resource = this.available.pop()!; this.inUse.add(resource); return resource; }
    if (this.inUse.size < this.maxSize) { const resource = await this.factory(); this.inUse.add(resource); return resource; }
    return new Promise(resolve => { const check = setInterval(() => { if (this.available.length > 0) { clearInterval(check); resolve(this.acquire()); } }, 100); });
  }
  release(resource: T): void { this.inUse.delete(resource); this.available.push(resource); }
  get size(): number { return this.available.length + this.inUse.size; }
}
