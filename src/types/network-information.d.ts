/**
 * Network Information API Type Declarations
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API
 */

type ConnectionType = 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
type EffectiveConnectionType = 'slow-2g' | '2g' | '3g' | '4g';

interface NetworkInformation extends EventTarget {
  /** Connection type */
  readonly type?: ConnectionType;
  /** Effective connection type */
  readonly effectiveType?: EffectiveConnectionType;
  /** Downlink speed in Mbps */
  readonly downlink?: number;
  /** Maximum downlink speed in Mbps */
  readonly downlinkMax?: number;
  /** Round-trip time in milliseconds */
  readonly rtt?: number;
  /** Whether data saver is enabled */
  readonly saveData?: boolean;
  /** Event handler for connection changes */
  onchange?: ((this: NetworkInformation, ev: Event) => void) | null;
}

declare global {
  interface Navigator {
    readonly connection?: NetworkInformation;
    readonly mozConnection?: NetworkInformation;
    readonly webkitConnection?: NetworkInformation;
  }
}

export {};
