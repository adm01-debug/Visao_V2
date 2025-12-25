import { useState, useCallback, useRef } from 'react';

interface UseSpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
}

interface UseSpeechReturn {
  speak: (text: string) => void;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  speaking: boolean;
  pending: boolean;
  paused: boolean;
  voices: SpeechSynthesisVoice[];
  supported: boolean;
}

export const useSpeech = (options: UseSpeechOptions = {}): UseSpeechReturn => {
  const { lang = 'pt-BR', rate = 1, pitch = 1, volume = 1, voice = null } = options;
  
  const [speaking, setSpeaking] = useState(false);
  const [pending, setPending] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useState(() => {
    if (!supported) return;
    
    const updateVoices = () => setVoices(speechSynthesis.getVoices());
    updateVoices();
    speechSynthesis.onvoiceschanged = updateVoices;
  });

  const speak = useCallback((text: string) => {
    if (!supported) return;
    
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    if (voice) utterance.voice = voice;
    
    utterance.onstart = () => { setSpeaking(true); setPending(false); };
    utterance.onend = () => { setSpeaking(false); setPaused(false); };
    utterance.onerror = () => { setSpeaking(false); setPending(false); setPaused(false); };
    utterance.onpause = () => setPaused(true);
    utterance.onresume = () => setPaused(false);
    
    utteranceRef.current = utterance;
    setPending(true);
    speechSynthesis.speak(utterance);
  }, [supported, lang, rate, pitch, volume, voice]);

  const cancel = useCallback(() => { if (supported) speechSynthesis.cancel(); }, [supported]);
  const pause = useCallback(() => { if (supported) speechSynthesis.pause(); }, [supported]);
  const resume = useCallback(() => { if (supported) speechSynthesis.resume(); }, [supported]);

  return { speak, cancel, pause, resume, speaking, pending, paused, voices, supported };
};

export default useSpeech;
