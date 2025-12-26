/**
 * Lazy Module Loading
 */
const moduleCache = new Map<string, any>();
export async function loadModule<T>(path: string): Promise<T> {
  if (moduleCache.has(path)) return moduleCache.get(path);
  const module = await import(/* @vite-ignore */ path);
  moduleCache.set(path, module);
  return module;
}
export function preloadModule(path: string): void {
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = path;
  document.head.appendChild(link);
}
export function clearModuleCache(): void { moduleCache.clear(); }
