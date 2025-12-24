import { useState, useEffect } from "react";

interface NetworkStatus {
  online: boolean;
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
  saveData?: boolean;
}

export const useNetworkStatus = (): NetworkStatus => {
  const [status, setStatus] = useState<NetworkStatus>({
    online: navigator.onLine,
  });

  useEffect(() => {
    const updateStatus = () => {
      const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
      setStatus({
        online: navigator.onLine,
        downlink: connection?.downlink,
        effectiveType: connection?.effectiveType,
        rtt: connection?.rtt,
        saveData: connection?.saveData,
      });
    };

    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    (navigator as Navigator & { connection?: NetworkInformation }).connection?.addEventListener("change", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
      (navigator as Navigator & { connection?: NetworkInformation }).connection?.removeEventListener("change", updateStatus);
    };
  }, []);

  return status;
};

export default useNetworkStatus;
