/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hooks barrel export - Exportação centralizada dos hooks
 *
 * @module hooks
 */

// Core UI hooks
export { useCountdown } from './useCountdown';
export { useHover } from './useHover';
export { useFocus } from './useFocus';
export { useClickAway } from './useClickAway';
export { useLockBodyScroll } from './useLockBodyScroll';
export { useScript } from './useScript';
export { useTitle } from './useTitle';

// State hooks
export * from './useDebounce';
export * from './useThrottle';
export * from './useLocalStorage';
export * from './useToggle';
export * from './useDisclosure';

// Form hooks
export * from './useForm';

// Data hooks
export * from './useFetch';
export * from './useAsync';

// Toast
export { useToast, toast } from './use-toast';

// UI hooks
export * from './useMediaQuery';
export * from './useWindowSize';
export * from './useScrollPosition';
export * from './useEventListener';

// Timing hooks
export * from './useInterval';
export * from './useTimeout';

// Utility hooks
export * from './usePrevious';
export * from './useClipboard';
export * from './useOffline';

// Keyboard hooks
export * from './useKeyboardShortcut';
export * from './useKeyboardShortcuts';

// Network hook
export * from './useNetworkState';

// Fullscreen
export * from './useFullscreen';

// Mount hooks
export * from './useMount';
export * from './useMounted';

// Speech hooks
export * from './useSpeechRecognition';
export * from './useSpeechSynthesis';

// Compatibility aliases
export { useClickAway as useOnClickOutside } from './useClickAway';
export { useClipboard as useCopyToClipboard } from './useClipboard';
