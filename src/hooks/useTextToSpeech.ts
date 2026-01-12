import { useState, useCallback } from 'react';

export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback((text: string, options?: { rate?: number; pitch?: number; lang?: string }) => {
    if (!window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 1;
    utterance.pitch = options?.pitch ?? 1;
    utterance.lang = options?.lang ?? 'pt-BR';
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => { window.speechSynthesis.cancel(); setSpeaking(false); }, []);

  return { speak, stop, speaking, supported: 'speechSynthesis' in window };
}

export default useTextToSpeech;
