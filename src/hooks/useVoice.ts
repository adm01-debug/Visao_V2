import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVoiceOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

interface UseVoiceReturn {
  transcript: string;
  interimTranscript: string;
  listening: boolean;
  supported: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export const useVoice = (options: UseVoiceOptions = {}): UseVoiceReturn => {
  const { lang = 'pt-BR', continuous = false, interimResults = true } = options;
  
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const supported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!supported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = lang;
    recognitionRef.current.continuous = continuous;
    recognitionRef.current.interimResults = interimResults;

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let interim = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript) setTranscript(prev => prev + finalTranscript);
      setInterimTranscript(interim);
    };

    recognitionRef.current.onend = () => setListening(false);
    recognitionRef.current.onerror = () => setListening(false);

    return () => { recognitionRef.current?.stop(); };
  }, [supported, lang, continuous, interimResults]);

  const start = useCallback(() => {
    if (recognitionRef.current && !listening) {
      setListening(true);
      recognitionRef.current.start();
    }
  }, [listening]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return { transcript, interimTranscript, listening, supported, start, stop, reset };
};

export default useVoice;
