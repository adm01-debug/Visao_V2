/**
 * Event utilities
 * @module utils/event
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

  listenerCount(event: string): number {
    return this.events.get(event)?.size || 0;
  }

  eventNames(): string[] {
    return Array.from(this.events.keys());
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Simple event functions for direct use
const globalListeners: Map<string, EventCallback[]> = new Map();

export function on(event: string, callback: EventCallback): () => void {
  if (!globalListeners.has(event)) {
    globalListeners.set(event, []);
  }
  globalListeners.get(event)!.push(callback);
  return () => off(event, callback);
}

export function off(event: string, callback: EventCallback): void {
  const callbacks = globalListeners.get(event);
  if (callbacks) {
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }
}

export function emit(event: string, ...args: unknown[]): void {
  const callbacks = globalListeners.get(event);
  if (callbacks) {
    callbacks.forEach(cb => cb(...args));
  }
}

export function once(event: string, callback: EventCallback): () => void {
  const wrapper = (...args: unknown[]) => {
    callback(...args);
    off(event, wrapper);
  };
  return on(event, wrapper);
}

export { EventBus };

export default {
  EventBus,
  eventBus,
  on,
  off,
  emit,
  once,
};
