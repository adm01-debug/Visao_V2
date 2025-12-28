/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Utility: pool
 * 
 * Pool de conexões/recursos reutilizáveis
 */

export interface PoolOptions<T> {
  min?: number;
  max?: number;
  acquireTimeout?: number; // ms
  idleTimeout?: number; // ms
  createTimeout?: number; // ms
  destroyTimeout?: number; // ms
  validate?: (resource: T) => Promise<boolean> | boolean;
  onCreate?: (resource: T) => void;
  onDestroy?: (resource: T) => void;
  onAcquire?: (resource: T) => void;
  onRelease?: (resource: T) => void;
}

export interface PoolStats {
  size: number;
  available: number;
  borrowed: number;
  pending: number;
  max: number;
}

interface PooledResource<T> {
  resource: T;
  createdAt: Date;
  lastUsedAt: Date;
  useCount: number;
}

export class Pool<T> {
  private available: PooledResource<T>[] = [];
  private borrowed = new Set<T>();
  private pendingAcquires: Array<{
    resolve: (resource: T) => void;
    reject: (error: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  }> = [];
  private creating = 0;
  private closed = false;
  private readonly options: Required<PoolOptions<T>>;

  constructor(
    private readonly factory: () => Promise<T> | T,
    options: PoolOptions<T> = {}
  ) {
    this.options = {
      min: options.min ?? 0,
      max: options.max ?? 10,
      acquireTimeout: options.acquireTimeout ?? 30000,
      idleTimeout: options.idleTimeout ?? 60000,
      createTimeout: options.createTimeout ?? 30000,
      destroyTimeout: options.destroyTimeout ?? 5000,
      validate: options.validate ?? (() => true),
      onCreate: options.onCreate ?? (() => {}),
      onDestroy: options.onDestroy ?? (() => {}),
      onAcquire: options.onAcquire ?? (() => {}),
      onRelease: options.onRelease ?? (() => {}),
    };

    // Inicializar pool com recursos mínimos
    this.initialize();
    
    // Limpeza periódica de recursos ociosos
    this.startIdleCheck();
  }

  private async initialize(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (let i = 0; i < this.options.min; i++) {
      promises.push(this.createResource());
    }
    await Promise.all(promises);
  }

  private async createResource(): Promise<void> {
    if (this.closed) return;
    
    this.creating++;
    try {
      const resource = await Promise.race([
        Promise.resolve(this.factory()),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout ao criar recurso')), this.options.createTimeout)
        ),
      ]);

      const pooledResource: PooledResource<T> = {
        resource,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        useCount: 0,
      };

      this.options.onCreate(resource);
      this.available.push(pooledResource);
      this.processQueue();
    } finally {
      this.creating--;
    }
  }

  async acquire(): Promise<T> {
    if (this.closed) {
      throw new Error('Pool está fechado');
    }

    // Verificar recursos disponíveis
    while (this.available.length > 0) {
      const pooled = this.available.pop()!;
      
      // Validar recurso
      const valid = await this.options.validate(pooled.resource);
      if (valid) {
        pooled.lastUsedAt = new Date();
        pooled.useCount++;
        this.borrowed.add(pooled.resource);
        this.options.onAcquire(pooled.resource);
        return pooled.resource;
      } else {
        await this.destroyResource(pooled.resource);
      }
    }

    // Criar novo recurso se possível
    if (this.size < this.options.max) {
      await this.createResource();
      return this.acquire();
    }

    // Aguardar recurso disponível
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.pendingAcquires.findIndex(p => p.resolve === resolve);
        if (index !== -1) {
          this.pendingAcquires.splice(index, 1);
          reject(new Error('Timeout ao adquirir recurso'));
        }
      }, this.options.acquireTimeout);

      this.pendingAcquires.push({ resolve, reject, timeoutId });
    });
  }

  release(resource: T): void {
    if (!this.borrowed.has(resource)) {
      throw new Error('Recurso não pertence ao pool');
    }

    this.borrowed.delete(resource);
    this.options.onRelease(resource);

    if (this.closed) {
      this.destroyResource(resource);
      return;
    }

    const pooled: PooledResource<T> = {
      resource,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 0,
    };

    this.available.push(pooled);
    this.processQueue();
  }

  private processQueue(): void {
    while (this.pendingAcquires.length > 0 && this.available.length > 0) {
      const pending = this.pendingAcquires.shift()!;
      const pooled = this.available.pop()!;
      
      clearTimeout(pending.timeoutId);
      pooled.lastUsedAt = new Date();
      pooled.useCount++;
      this.borrowed.add(pooled.resource);
      this.options.onAcquire(pooled.resource);
      pending.resolve(pooled.resource);
    }
  }

  private async destroyResource(resource: T): Promise<void> {
    try {
      this.options.onDestroy(resource);
    } catch {
      // Ignorar erros ao destruir
    }
  }

  private startIdleCheck(): void {
    setInterval(() => {
      const now = Date.now();
      const minSize = this.options.min;

      while (this.available.length > minSize) {
        const oldest = this.available[0];
        if (now - oldest.lastUsedAt.getTime() > this.options.idleTimeout) {
          this.available.shift();
          this.destroyResource(oldest.resource);
        } else {
          break;
        }
      }
    }, this.options.idleTimeout / 2);
  }

  get size(): number {
    return this.available.length + this.borrowed.size + this.creating;
  }

  getStats(): PoolStats {
    return {
      size: this.size,
      available: this.available.length,
      borrowed: this.borrowed.size,
      pending: this.pendingAcquires.length,
      max: this.options.max,
    };
  }

  async close(): Promise<void> {
    this.closed = true;

    // Rejeitar pendentes
    for (const pending of this.pendingAcquires) {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error('Pool fechado'));
    }
    this.pendingAcquires = [];

    // Destruir disponíveis
    for (const pooled of this.available) {
      await this.destroyResource(pooled.resource);
    }
    this.available = [];
  }

  async use<R>(fn: (resource: T) => Promise<R> | R): Promise<R> {
    const resource = await this.acquire();
    try {
      return await fn(resource);
    } finally {
      this.release(resource);
    }
  }
}

export function createPool<T>(
  factory: () => Promise<T> | T,
  options?: PoolOptions<T>
): Pool<T> {
  return new Pool(factory, options);
}

export default Pool;
