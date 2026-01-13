/**
 * Scroll utilities - Re-exports from @/utils/scroll
 */

export {
  scrollToTop,
  scrollToBottom,
  scrollToElement,
  getScrollPosition,
  getScrollPercent,
  isScrolledToBottom,
  isScrolledToTop,
  lockScroll,
  unlockScroll,
  isElementInViewport,
  getElementScrollPercent,
  scrollElementToTop,
  scrollElementToBottom,
  smoothScrollTo,
} from '@/utils/scroll';

// Legacy API compatibility
import {
  scrollToTop as _scrollToTop,
  scrollToBottom as _scrollToBottom,
  scrollToElement as _scrollToElement,
  getScrollPosition as _getScrollPosition,
} from '@/utils/scroll';

/**
 * @deprecated Use scrollToTop, scrollToBottom, scrollToElement from @/utils/scroll
 */
export function scrollTo(y: number, smooth = true): void {
  window.scrollTo({ top: y, behavior: smooth ? "smooth" : "auto" });
}

/**
 * @deprecated Use the exported scrollToElement from @/utils/scroll
 */
export function onScroll(callback: () => void): () => void {
  window.addEventListener("scroll", callback);
  return () => window.removeEventListener("scroll", callback);
}

export default {
  scrollTo,
  scrollToTop: _scrollToTop,
  scrollToBottom: _scrollToBottom,
  scrollToElement: _scrollToElement,
  getScrollPosition: _getScrollPosition,
  onScroll,
};
