/**
 * Extended Navigator API Type Declarations
 * Includes Device Memory, Network Information, and other experimental APIs
 */

interface NetworkInformation extends EventTarget {
  readonly downlink: number;
  readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  readonly rtt: number;
  readonly saveData: boolean;
  readonly type?: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
  onchange: ((this: NetworkInformation, ev: Event) => void) | null;
}

interface PerformanceMemory {
  readonly jsHeapSizeLimit: number;
  readonly totalJSHeapSize: number;
  readonly usedJSHeapSize: number;
}

declare global {
  interface Navigator {
    /** Device memory in gigabytes (approximate) */
    readonly deviceMemory?: number;
    /** Network Information API */
    readonly connection?: NetworkInformation;
    readonly mozConnection?: NetworkInformation;
    readonly webkitConnection?: NetworkInformation;
  }

  interface Performance {
    /** Memory information (Chrome/Edge only) */
    readonly memory?: PerformanceMemory;
  }

  interface Window {
    /** Force garbage collection (only available in dev tools or with flags) */
    gc?: () => void;
  }
}

export {};
