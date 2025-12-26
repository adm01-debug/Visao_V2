/**
 * Critical CSS Inline
 */
export function inlineCriticalCSS(css: string): void {
  const style = document.createElement('style');
  style.setAttribute('data-critical', 'true');
  style.textContent = css;
  document.head.insertBefore(style, document.head.firstChild);
}
export function loadDeferredCSS(href: string): void {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.media = 'print';
  link.onload = () => { link.media = 'all'; };
  document.head.appendChild(link);
}
export function extractCriticalCSS(html: string): string {
  // Simplified - would use actual critical CSS extraction in production
  const match = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  return match ? match[1] : '';
}
