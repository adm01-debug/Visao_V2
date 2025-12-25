/**
 * Scroll Utilities
 */

export const scrollToTop = (behavior: ScrollBehavior = 'smooth'): void => {
  window.scrollTo({ top: 0, behavior });
};

export const scrollToBottom = (behavior: ScrollBehavior = 'smooth'): void => {
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
};

export const scrollToElement = (
  element: HTMLElement | string,
  options: { behavior?: ScrollBehavior; offset?: number; block?: ScrollLogicalPosition } = {}
): void => {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (!el) return;
  
  const { behavior = 'smooth', offset = 0, block = 'start' } = options;
  
  if (offset) {
    const y = el.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top: y, behavior });
  } else {
    el.scrollIntoView({ behavior, block });
  }
};

export const getScrollPosition = (): { x: number; y: number } => ({
  x: window.scrollX || window.pageXOffset,
  y: window.scrollY || window.pageYOffset,
});

export const getScrollPercent = (): number => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  return scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
};

export const isScrolledToBottom = (threshold = 0): boolean => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight;
  const clientHeight = window.innerHeight;
  return scrollTop + clientHeight >= scrollHeight - threshold;
};

export const isScrolledToTop = (threshold = 0): boolean => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  return scrollTop <= threshold;
};

export const lockScroll = (): void => {
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
};

export const unlockScroll = (): void => {
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
};

export const isElementInViewport = (element: HTMLElement, offset = 0): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= -offset &&
    rect.left >= -offset &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + offset &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth) + offset
  );
};

export const getElementScrollPercent = (element: HTMLElement): number => {
  const { scrollTop, scrollHeight, clientHeight } = element;
  return scrollHeight > clientHeight ? (scrollTop / (scrollHeight - clientHeight)) * 100 : 0;
};

export const scrollElementToTop = (element: HTMLElement, behavior: ScrollBehavior = 'smooth'): void => {
  element.scrollTo({ top: 0, behavior });
};

export const scrollElementToBottom = (element: HTMLElement, behavior: ScrollBehavior = 'smooth'): void => {
  element.scrollTo({ top: element.scrollHeight, behavior });
};

export const smoothScrollTo = (targetY: number, duration = 500): void => {
  const startY = window.scrollY;
  const diff = targetY - startY;
  const startTime = performance.now();

  const step = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 0.5 - Math.cos(progress * Math.PI) / 2;
    window.scrollTo(0, startY + diff * ease);
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
};
