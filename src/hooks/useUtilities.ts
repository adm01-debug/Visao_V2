/**
 * VISÃO - Sistema de Vigilância Inteligente
 * useUtilities - Re-exports centralized hooks for backward compatibility
 * 
 * @module hooks/useUtilities
 * @deprecated Use individual hook imports from @/hooks instead
 */

// Re-export all utilities from individual files for backward compatibility
export { useDebounce } from './useDebounce';
export { useThrottle } from './useThrottle';
export { usePrevious } from './usePrevious';
export { useToggle } from './useToggle';
export { useLocalStorage } from './useLocalStorage';
export { useMediaQuery, useBreakpoint, useIsMobile, useIsTablet, useIsDesktop } from './useMediaQuery';
export { useOnlineStatus } from './useOnlineStatus';
export { useClipboard } from './useClipboard';
export { useInterval } from './useInterval';
export { useCountdown } from './useCountdown';
export { useWindowSize } from './useWindowSize';

// useOnScreen - re-export
export { useOnScreen } from './useOnScreen';

// useClickOutside - re-export
export { useClickAway as useClickOutside } from './useClickAway';

// useDocumentTitle - re-export from useTitle
export { useTitle as useDocumentTitle } from './useTitle';
