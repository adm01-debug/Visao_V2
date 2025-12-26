/**
 * useSpeechSynthesis Hook
 * Text-to-speech functionality
 */
import { useState, useCallback, useEffect } from 'react';

export function useSpeechSynthesis() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    if (!isSupported) return;
    const loadVoices = () => setVoices(speechSynthesis.getVoices());
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }, [isSupported]);

  const speak = useCallback((text: string, voice?: SpeechSynthesisVoice, rate = 1, pitch = 1) => {
    if (!isSupported) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); };
    speechSynthesis.speak(utterance);
  }, [isSupported]);

  const pause = useCallback(() => { speechSynthesis.pause(); setIsPaused(true); }, []);
  const resume = useCallback(() => { speechSynthesis.resume(); setIsPaused(false); }, []);
  const cancel = useCallback(() => { speechSynthesis.cancel(); setIsSpeaking(false); setIsPaused(false); }, []);

  return { voices, isSpeaking, isPaused, isSupported, speak, pause, resume, cancel };
}
export default useSpeechSynthesis;
