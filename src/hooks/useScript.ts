import { useState, useEffect } from 'react';

type ScriptStatus = 'loading' | 'ready' | 'error';

export function useScript(src: string): ScriptStatus {
  const [status, setStatus] = useState<ScriptStatus>('loading');

  useEffect(() => {
    const existingScript = document.querySelector(`script[src="${src}"]`);
    
    if (existingScript) {
      setStatus('ready');
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;

    const handleLoad = () => setStatus('ready');
    const handleError = () => setStatus('error');

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    document.body.appendChild(script);

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
  }, [src]);

  return status;
}

export default useScript;
