/**
 * Performance Memory API Type Declarations
 * Non-standard Chrome API for memory monitoring
 */

interface MemoryInfo {
  /** Total JavaScript heap size in bytes */
  readonly totalJSHeapSize: number;
  /** Used JavaScript heap size in bytes */
  readonly usedJSHeapSize: number;
  /** JavaScript heap size limit in bytes */
  readonly jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  /** Memory information (Chrome only) */
  readonly memory?: MemoryInfo;
}

declare global {
  interface Performance {
    readonly memory?: MemoryInfo;
  }
}

export { MemoryInfo, PerformanceWithMemory };
