/**
 * PWA Update Prompt Hook
 */
import { useState, useEffect } from 'react';
export function useUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        setRegistration(reg);
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => { if (newWorker.state === 'installed' && navigator.serviceWorker.controller) setUpdateAvailable(true); });
        });
      });
    }
  }, []);
  const update = () => { registration?.waiting?.postMessage({ type: 'SKIP_WAITING' }); window.location.reload(); };
  return { updateAvailable, update };
}
export default useUpdatePrompt;
