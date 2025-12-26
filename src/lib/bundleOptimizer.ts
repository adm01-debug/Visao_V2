/**
 * Bundle Optimizer Utils
 */
export function analyzeDependencies(): { name: string; size: number }[] {
  // Would use actual bundle analysis in production
  return [{ name: 'react', size: 40000 }, { name: 'react-dom', size: 120000 }];
}
export function suggestSplitPoints(deps: { name: string; size: number }[]): string[] {
  return deps.filter(d => d.size > 50000).map(d => d.name);
}
export function getLoadedChunks(): string[] {
  return Array.from(document.querySelectorAll('script[src]')).map(s => (s as HTMLScriptElement).src);
}
