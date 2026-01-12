/**
 * Event Bus for component communication
 * @module lib/eventBus
 */

type EventCallback = (...args: unknown[]) => void;

class EventBus {
  private events: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
    
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    this.events.get(event)?.delete(callback);
  }

  emit(event: string, ...args: unknown[]): void {
    this.events.get(event)?.forEach(callback => callback(...args));
  }

  once(event: string, callback: EventCallback): () => void {
    const wrapper = (...args: unknown[]) => {
      callback(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  clear(): void {
    this.events.clear();
  }
}

export const eventBus = new EventBus();
export default EventBus;
