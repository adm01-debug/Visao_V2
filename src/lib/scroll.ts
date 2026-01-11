/**
 * Scroll utilities
 */

export function scrollTo(y: number, smooth = true): void {
  window.scrollTo({ top: y, behavior: smooth ? "smooth" : "auto" });
}

export function scrollToTop(smooth = true): void {
  scrollTo(0, smooth);
}

export function scrollToBottom(smooth = true): void {
  scrollTo(document.body.scrollHeight, smooth);
}

export function scrollToElement(element: HTMLElement, smooth = true): void {
  element.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
}

export function getScrollPosition(): { x: number; y: number } {
  return { x: window.scrollX, y: window.scrollY };
}

export function onScroll(callback: () => void): () => void {
  window.addEventListener("scroll", callback);
  return () => window.removeEventListener("scroll", callback);
}

export default { scrollTo, scrollToTop, scrollToBottom, scrollToElement, getScrollPosition, onScroll };

