/**
 * Keyboard utilities
 */

type KeyHandler = (event: KeyboardEvent) => void;
const handlers: Map<string, KeyHandler[]> = new Map();

export function onKey(key: string, handler: KeyHandler): () => void {
  if (!handlers.has(key)) {
    handlers.set(key, []);
  }
  handlers.get(key)!.push(handler);
  
  return () => offKey(key, handler);
}

export function offKey(key: string, handler: KeyHandler): void {
  const keyHandlers = handlers.get(key);
  if (keyHandlers) {
    const index = keyHandlers.indexOf(handler);
    if (index !== -1) keyHandlers.splice(index, 1);
  }
}

export function init(): void {
  document.addEventListener("keydown", (event) => {
    const keyHandlers = handlers.get(event.key);
    keyHandlers?.forEach(h => h(event));
  });
}

export function isPressed(event: KeyboardEvent, key: string): boolean {
  return event.key === key;
}

export default { onKey, offKey, init, isPressed };

