/**
 * Throttle Utility
 */
export function throttle<T extends (...args: any[]) => any>(fn: T, limit: number): T {
  let lastCall = 0;
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= limit) { lastCall = now; return fn(...args); }
  }) as T;
}
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timer: NodeJS.Timeout;
  return ((...args: Parameters<T>) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }) as T;
}
