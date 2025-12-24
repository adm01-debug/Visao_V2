import { useEffect, useRef } from "react";

type EventHandler<T extends Event = Event> = (event: T) => void;

export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: EventHandler<WindowEventMap[K]>,
  element?: undefined,
  options?: boolean | AddEventListenerOptions
): void;

export function useEventListener<
  K extends keyof HTMLElementEventMap,
  T extends HTMLElement = HTMLDivElement
>(
  eventName: K,
  handler: EventHandler<HTMLElementEventMap[K]>,
  element: React.RefObject<T>,
  options?: boolean | AddEventListenerOptions
): void;

export function useEventListener(
  eventName: string,
  handler: EventHandler,
  element?: React.RefObject<HTMLElement>,
  options?: boolean | AddEventListenerOptions
) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const targetElement = element?.current ?? window;
    if (!targetElement?.addEventListener) return;

    const listener: EventHandler = (event) => savedHandler.current(event);
    targetElement.addEventListener(eventName, listener, options);

    return () => {
      targetElement.removeEventListener(eventName, listener, options);
    };
  }, [eventName, element, options]);
}

export default useEventListener;
