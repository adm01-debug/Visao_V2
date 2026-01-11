/**
 * Focus utilities
 */

export function getFocusedElement(): Element | null {
  return document.activeElement;
}

export function focus(element: HTMLElement): void {
  element.focus();
}

export function blur(element: HTMLElement): void {
  element.blur();
}

export function isFocused(element: HTMLElement): boolean {
  return document.activeElement === element;
}

export function trapFocus(container: HTMLElement): () => void {
  const focusable = container.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])");
  const first = focusable[0] as HTMLElement;
  const last = focusable[focusable.length - 1] as HTMLElement;

  const handler = (e: KeyboardEvent) => {
    if (e.key === "Tab") {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  container.addEventListener("keydown", handler);
  return () => container.removeEventListener("keydown", handler);
}

export default { getFocusedElement, focus, blur, isFocused, trapFocus };

