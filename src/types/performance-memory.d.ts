/**
 * Performance Memory API Type Declarations
 * Non-standard API available in Chrome/Edge
 */

interface MemoryInfo {
  /** Total heap size in bytes */
  totalJSHeapSize: number;
  /** Used heap size in bytes */
  usedJSHeapSize: number;
  /** Maximum heap size in bytes */
  jsHeapSizeLimit: number;
}

interface PerformanceMemory {
  memory?: MemoryInfo;
}

declare global {
  interface Performance extends PerformanceMemory {}
  
  interface Navigator {
    /** Device memory in gigabytes (approximate) */
    deviceMemory?: number;
  }
}

export {};
