export const $ = (selector: string): Element | null => document.querySelector(selector);
export const $$ = (selector: string): Element[] => Array.from(document.querySelectorAll(selector));

export const addClass = (el: Element, ...classes: string[]): void => el.classList.add(...classes);
export const removeClass = (el: Element, ...classes: string[]): void => el.classList.remove(...classes);
export const toggleClass = (el: Element, className: string): void => el.classList.toggle(className);
export const hasClass = (el: Element, className: string): boolean => el.classList.contains(className);

export const getOffset = (el: Element): { top: number; left: number } => {
  const rect = el.getBoundingClientRect();
  return { top: rect.top + window.scrollY, left: rect.left + window.scrollX };
};

export const isVisible = (el: Element): boolean => {
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0;
};

export const scrollTo = (el: Element | string, options?: ScrollIntoViewOptions): void => {
  const element = typeof el === 'string' ? $(el) : el;
  element?.scrollIntoView({ behavior: 'smooth', block: 'start', ...options });
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
};
