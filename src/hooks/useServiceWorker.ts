import { useState, useEffect, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  update: () => void;
}

export const useServiceWorker = (): ServiceWorkerState => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        setIsRegistered(true);
        reg.addEventListener('updatefound', () => setIsUpdateAvailable(true));
      });
    }
  }, []);

  const update = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [registration]);

  return {
    isSupported: 'serviceWorker' in navigator,
    isRegistered,
    isUpdateAvailable,
    update,
  };
};
