/**
 * DOM utilities
 */

export function $(selector: string): Element | null {
  return document.querySelector(selector);
}

export function $$(selector: string): NodeListOf<Element> {
  return document.querySelectorAll(selector);
}

export function addClass(element: Element, className: string): void {
  element.classList.add(className);
}

export function removeClass(element: Element, className: string): void {
  element.classList.remove(className);
}

export function toggleClass(element: Element, className: string): void {
  element.classList.toggle(className);
}

export function hasClass(element: Element, className: string): boolean {
  return element.classList.contains(className);
}

export function show(element: HTMLElement): void {
  element.style.display = "";
}

export function hide(element: HTMLElement): void {
  element.style.display = "none";
}

export default { $, $$, addClass, removeClass, toggleClass, hasClass, show, hide };

