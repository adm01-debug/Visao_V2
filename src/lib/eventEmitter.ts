type Handler<T = unknown> = (data: T) => void;

class EventEmitter {
  private events: Map<string, Handler[]> = new Map();

  on<T>(event: string, handler: Handler<T>): () => void {
    const handlers = this.events.get(event) || [];
    handlers.push(handler as Handler);
    this.events.set(event, handlers);
    return () => this.off(event, handler);
  }

  off<T>(event: string, handler: Handler<T>): void {
    const handlers = this.events.get(event) || [];
    this.events.set(event, handlers.filter(h => h !== handler));
  }

  emit<T>(event: string, data: T): void {
    (this.events.get(event) || []).forEach(h => h(data));
  }

  clear(): void {
    this.events.clear();
  }
}

export const eventBus = new EventEmitter();
