/**
 * Network Information API Type Declarations
 * @see https://wicg.github.io/netinfo/
 */

type ConnectionType = 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
type EffectiveConnectionType = 'slow-2g' | '2g' | '3g' | '4g';

interface NetworkInformation extends EventTarget {
  /** The type of connection */
  readonly type?: ConnectionType;
  /** Effective type of the connection */
  readonly effectiveType?: EffectiveConnectionType;
  /** Estimated downlink speed in Mbps */
  readonly downlink?: number;
  /** Maximum downlink speed in Mbps */
  readonly downlinkMax?: number;
  /** Estimated round-trip time in ms */
  readonly rtt?: number;
  /** True if user has requested reduced data usage */
  readonly saveData?: boolean;
  /** Handler for connection changes */
  onchange?: ((this: NetworkInformation, ev: Event) => void) | null;
}

interface NavigatorWithConnection extends Navigator {
  readonly connection?: NetworkInformation;
  readonly mozConnection?: NetworkInformation;
  readonly webkitConnection?: NetworkInformation;
}

declare global {
  interface Navigator {
    readonly connection?: NetworkInformation;
    readonly mozConnection?: NetworkInformation;
    readonly webkitConnection?: NetworkInformation;
    readonly deviceMemory?: number;
  }
}

export { NetworkInformation, ConnectionType, EffectiveConnectionType };
