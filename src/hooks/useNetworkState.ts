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
    const connection = (navigator as any).connection;

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
