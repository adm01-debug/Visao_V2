/**
 * Animation utilities
 */

export function animate(
  element: HTMLElement,
  keyframes: Keyframe[],
  options?: KeyframeAnimationOptions
): Animation {
  return element.animate(keyframes, options);
}

export function fadeIn(element: HTMLElement, duration = 300): Animation {
  return animate(element, [{ opacity: 0 }, { opacity: 1 }], { duration });
}

export function fadeOut(element: HTMLElement, duration = 300): Animation {
  return animate(element, [{ opacity: 1 }, { opacity: 0 }], { duration });
}

export function slideIn(element: HTMLElement, duration = 300): Animation {
  return animate(
    element,
    [{ transform: "translateX(-100%)" }, { transform: "translateX(0)" }],
    { duration }
  );
}

export function slideOut(element: HTMLElement, duration = 300): Animation {
  return animate(
    element,
    [{ transform: "translateX(0)" }, { transform: "translateX(100%)" }],
    { duration }
  );
}

export default { animate, fadeIn, fadeOut, slideIn, slideOut };

