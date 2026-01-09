import { useState, useCallback, useRef, useEffect } from 'react';

export interface VoiceState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
}

export interface VoiceActions {
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export interface UseVoiceOptions {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

type SpeechRecognitionType = typeof window.SpeechRecognition;

export const useVoice = (options: UseVoiceOptions = {}): VoiceState & VoiceActions => {
  const { continuous = false, interimResults = true, lang = 'pt-BR', onResult, onError } = options;
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<InstanceType<SpeechRecognitionType> | null>(null);
  
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isSupported) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = continuous;
    recognitionRef.current.interimResults = interimResults;
    recognitionRef.current.lang = lang;

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      let final = '', interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        event.results[i].isFinal ? (final += t) : (interim += t);
      }
      if (final) { setTranscript(p => p + final); onResult?.(final); }
      setInterimTranscript(interim);
    };

    recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(event.error); onError?.(event.error); setIsListening(false);
    };

    recognitionRef.current.onend = () => setIsListening(false);
    return () => { recognitionRef.current?.stop(); };
  }, [continuous, interimResults, lang, onResult, onError, isSupported]);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return;
    setError(null); setInterimTranscript('');
    try { recognitionRef.current.start(); setIsListening(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'Start failed'); }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop(); setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript(''); setInterimTranscript('');
  }, []);

  return { isListening, transcript, interimTranscript, error, isSupported, startListening, stopListening, resetTranscript };
};

export default useVoice;
