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
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load and cache voices asynchronously across all browsers
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsAvailable(false);
      return;
    }

    const updateVoices = () => {
      try {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices && availableVoices.length > 0) {
          setVoices(availableVoices);
        }
      } catch (e) {
        // Ignore voice query errors
      }
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
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

  // Find the best voice for a given language
  const findVoiceForLanguage = useCallback((lang: Language): SpeechSynthesisVoice | null => {
    if (!voices || voices.length === 0) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const vList = window.speechSynthesis.getVoices();
        if (vList && vList.length > 0) {
          return matchVoice(vList, lang);
        }
      }
      return null;
    }
    return matchVoice(voices, lang);
  }, [voices]);

  function matchVoice(voiceList: SpeechSynthesisVoice[], lang: Language): SpeechSynthesisVoice | null {
    const langLower = lang.toLowerCase();
    
    if (langLower === 'si') {
      // Look for Sinhala voices
      const match = voiceList.find(
        (v) =>
          v.lang.toLowerCase().startsWith('si') ||
          v.lang.toLowerCase().includes('sinh') ||
          v.name.toLowerCase().includes('sinhala') ||
          v.name.toLowerCase().includes('sinhalese')
      );
      if (match) return match;
    } else if (langLower === 'ta') {
      // Look for Tamil voices (ta-LK, ta-IN, ta_LK, ta_IN, or named Tamil)
      const match = voiceList.find(
        (v) =>
          v.lang.toLowerCase().startsWith('ta') ||
          v.lang.toLowerCase().includes('tamil') ||
          v.name.toLowerCase().includes('tamil') ||
          v.name.toLowerCase().includes('valluvar') ||
          v.name.toLowerCase().includes('pallavi')
      );
      if (match) return match;
    } else {
      // English voices
      const match = voiceList.find(
        (v) =>
          v.lang.toLowerCase().startsWith('en') &&
          (v.lang.toLowerCase().includes('gb') ||
           v.lang.toLowerCase().includes('us') ||
           v.lang.toLowerCase().includes('in') ||
           v.lang.toLowerCase().includes('lk') ||
           v.default)
      );
      if (match) return match;
    }

    return null;
  }

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

  const lastTextRef = useRef<string>('');
  const lastLangRef = useRef<Language>('en');

  const speak = useCallback(
    (text: string, lang: Language = 'en') => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setIsAvailable(false);
        if (onError) onError(new Error('Speech synthesis unavailable'));
        return;
      }

      // Stop any active utterance before starting a new one
      window.speechSynthesis.cancel();

      if (!text || !text.trim()) {
        setStatus('idle');
        return;
      }

      lastTextRef.current = text;
      lastLangRef.current = lang;

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      utterance.lang = getLanguageTag(lang);
      utterance.rate = 0.95; // Clear natural pace

      const matchedVoice = findVoiceForLanguage(lang);
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

      utterance.onerror = (e: any) => {
        // Canceled or interrupted by user action is expected
        if (e.error === 'canceled' || e.error === 'interrupted') {
          setStatus('idle');
          return;
        }
        setStatus('idle');
        if (onError) onError(e);
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        setStatus('idle');
        if (onError) onError(err);
      }
    },
    [findVoiceForLanguage, onEnd, onError]
  );

  const replay = useCallback(() => {
    if (lastTextRef.current) {
      speak(lastTextRef.current, lastLangRef.current);
    }
  }, [speak]);

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
    voices,
    hasVoiceFor: (lang: Language) => !!findVoiceForLanguage(lang),
    speak,
    stop,
    pause,
    resume,
    replay,
  };
}


