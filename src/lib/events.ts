/**
 * Event utilities
 */

type EventCallback = (event: Event) => void;

const listeners: Map<string, EventCallback[]> = new Map();

export function on(event: string, callback: EventCallback): void {
  if (!listeners.has(event)) {
    listeners.set(event, []);
  }
  listeners.get(event)!.push(callback);
}

export function off(event: string, callback: EventCallback): void {
  const callbacks = listeners.get(event);
  if (callbacks) {
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }
}

export function emit(event: string, data?: unknown): void {
  const callbacks = listeners.get(event);
  if (callbacks) {
    const e = new CustomEvent(event, { detail: data });
    callbacks.forEach(cb => cb(e));
  }
}

export function once(event: string, callback: EventCallback): void {
  const wrapper = (e: Event) => {
    callback(e);
    off(event, wrapper);
  };
  on(event, wrapper);
}

export default { on, off, emit, once };

