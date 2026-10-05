import { useState, useEffect, useRef, useCallback } from 'react';
import { Language } from '../i18n/types';

export type SpeakStatus = 'idle' | 'playing' | 'paused';

interface UseSpeakTextOptions {
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export function useSpeakText({ onEnd, onError }: UseSpeakTextOptions = {}) {
  const [status, setStatus] = useState<SpeakStatus>('idle');
  const [currentText, setCurrentText] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsAvailable(false);
    }
  }, []);

  const getLanguageTag = (lang: Language): string => {
    switch (lang) {
      case 'si':
        return 'si-LK';
      case 'ta':
        return 'ta-LK';
      case 'en':
      default:
        return 'en-US';
    }
  };

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setStatus('idle');
      setCurrentText('');
    }
  }, []);

  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
      setStatus('paused');
    }
  }, []);

  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume();
      setStatus('playing');
    }
  }, []);

  const speak = useCallback(
    (text: string, lang: Language = 'en') => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setIsAvailable(false);
        return;
      }

      // Stop any active utterance before starting a new one
      window.speechSynthesis.cancel();

      if (!text.trim()) {
        setStatus('idle');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      utterance.lang = getLanguageTag(lang);
      utterance.rate = 0.95; // Slightly clearer pace for parliamentary transcripts

      // Try to find matching voice for the language if available
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = lang === 'si' ? 'si' : lang === 'ta' ? 'ta' : 'en';
      const matchedVoice = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        setStatus('playing');
        setCurrentText(text);
      };

      utterance.onend = () => {
        setStatus('idle');
        setCurrentText('');
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        // Canceled is not a true error
        if (e.error === 'canceled' || e.error === 'interrupted') {
          setStatus('idle');
          return;
        }
        setStatus('idle');
        if (onError) onError(e);
      };

      window.speechSynthesis.speak(utterance);
    },
    [onEnd, onError]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isAvailable,
    status,
    currentText,
    speak,
    stop,
    pause,
    resume,
  };
}
