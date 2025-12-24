import React, { useEffect, useRef, useCallback, ReactNode } from "react";

interface FocusTrapProps {
  children: ReactNode;
  active?: boolean;
  onEscape?: () => void;
  initialFocus?: boolean;
  returnFocus?: boolean;
}

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(", ");

export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  active = true,
  onEscape,
  initialFocus = true,
  returnFocus = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    ).filter((el) => el.offsetParent !== null);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!active) return;

      if (event.key === "Escape" && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [active, onEscape, getFocusableElements]
  );

  useEffect(() => {
    if (active && returnFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    return () => {
      if (returnFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [active, returnFocus]);

  useEffect(() => {
    if (active && initialFocus) {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }
  }, [active, initialFocus, getFocusableElements]);

  useEffect(() => {
    if (active) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [active, handleKeyDown]);

  return (
    <div ref={containerRef} data-focus-trap={active}>
      {children}
    </div>
  );
};

export default FocusTrap;
