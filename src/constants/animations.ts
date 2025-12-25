export const ANIMATION_DURATION = { fast: 150, normal: 300, slow: 500 };

export const ANIMATION_EASING = {
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

export const FRAMER_VARIANTS = {
  fadeIn: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  slideUp: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 20 } },
  slideDown: { initial: { opacity: 0, y: -20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } },
  scale: { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.9 } },
};

export const CSS_TRANSITIONS = {
  all: `all ${ANIMATION_DURATION.normal}ms ${ANIMATION_EASING.easeInOut}`,
  opacity: `opacity ${ANIMATION_DURATION.fast}ms ${ANIMATION_EASING.easeOut}`,
  transform: `transform ${ANIMATION_DURATION.normal}ms ${ANIMATION_EASING.spring}`,
};
