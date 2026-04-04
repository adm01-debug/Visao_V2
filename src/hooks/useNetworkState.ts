// Type declarations for Network Information API
declare global {
  interface NetworkInformation extends EventTarget {
    type: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
    effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
    downlink: number;
    rtt: number;
    saveData: boolean;
    onchange: ((this: NetworkInformation, ev: Event) => void) | null;
  }
  interface Navigator {
    connection?: NetworkInformation;
  }
}

import { useState, useEffect } from 'react';

interface NetworkState {
  online: boolean;
  downlink?: number;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  rtt?: number;
  saveData?: boolean;
  type?: string;
}

export const useNetworkState = (): NetworkState => {
  const [state, setState] = useState<NetworkState>({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });

  useEffect(() => {
    const connection = navigator.connection;

    const updateNetworkState = () => {
      setState({
        online: navigator.onLine,
        downlink: connection?.downlink,
        effectiveType: connection?.effectiveType,
        rtt: connection?.rtt,
        saveData: connection?.saveData,
        type: connection?.type,
      });
    };

    updateNetworkState();

    window.addEventListener('online', updateNetworkState);
    window.addEventListener('offline', updateNetworkState);
    connection?.addEventListener('change', updateNetworkState);

    return () => {
      window.removeEventListener('online', updateNetworkState);
      window.removeEventListener('offline', updateNetworkState);
      connection?.removeEventListener('change', updateNetworkState);
    };
  }, []);

  return state;
};

export default useNetworkState;
