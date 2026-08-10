export const TRANSITION_DURATION = {
  instant: '0ms',
  fast: '100ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;

export const TRANSITION_TIMING = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

export const TRANSITIONS = {
  default: `all ${TRANSITION_DURATION.normal} ${TRANSITION_TIMING.easeInOut}`,
  fast: `all ${TRANSITION_DURATION.fast} ${TRANSITION_TIMING.easeOut}`,
  slow: `all ${TRANSITION_DURATION.slow} ${TRANSITION_TIMING.easeInOut}`,
  opacity: `opacity ${TRANSITION_DURATION.normal} ${TRANSITION_TIMING.easeOut}`,
  transform: `transform ${TRANSITION_DURATION.normal} ${TRANSITION_TIMING.spring}`,
  colors: `background-color ${TRANSITION_DURATION.normal}, border-color ${TRANSITION_DURATION.normal}, color ${TRANSITION_DURATION.normal}`,
} as const;

export default TRANSITIONS;
