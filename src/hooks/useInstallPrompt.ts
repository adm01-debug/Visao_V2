/**
 * PWA Install Prompt Hook
 */
import { useState, useEffect } from 'react';
export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e); setIsInstallable(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const install = async () => { if (prompt) { prompt.prompt(); const result = await prompt.userChoice; setIsInstallable(false); return result.outcome === 'accepted'; } return false; };
  return { isInstallable, install };
}
export default useInstallPrompt;
