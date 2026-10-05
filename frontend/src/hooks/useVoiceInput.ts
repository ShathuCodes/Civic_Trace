import { useState, useEffect, useRef, useCallback } from 'react';
import { Language } from '../i18n/types';

export type VoiceStatus = 'idle' | 'listening' | 'transcribing' | 'error' | 'ready';

export interface VoiceError {
  type: 'permission_denied' | 'no_speech' | 'unsupported' | 'network' | 'timeout' | 'generic';
  message?: string;
}

interface UseVoiceInputOptions {
  language: Language;
  onResult?: (text: string) => void;
  maxDurationMs?: number;
}

// Window interface augmentation for SpeechRecognition
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function useVoiceInput({
  language,
  onResult,
  maxDurationMs = 30000,
}: UseVoiceInputOptions) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<VoiceError | null>(null);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<number | null>(null);

  // Map application language to BCP-47 speech recognition codes
  const getLanguageCode = useCallback((lang: Language): string => {
    switch (lang) {
      case 'si':
        return 'si-LK';
      case 'ta':
        return 'ta-LK'; // Will also match ta-IN if LK not available
      case 'en':
      default:
        return 'en-US';
    }
  }, []);

  const isSupported = typeof window !== 'undefined' &&
    !!((window as IWindow).SpeechRecognition || (window as IWindow).webkitSpeechRecognition);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore cleanup errors
      }
      recognitionRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        cleanup();
        setStatus('idle');
      }
    }
  }, [cleanup]);

  const cancel = useCallback(() => {
    cleanup();
    setStatus('idle');
    setInterimTranscript('');
  }, [cleanup]);

  const start = useCallback(() => {
    if (!isSupported) {
      setError({ type: 'unsupported' });
      setStatus('error');
      return;
    }

    cleanup();
    setError(null);
    setTranscript('');
    setInterimTranscript('');

    const Win = window as IWindow;
    const SpeechRecognitionClass = Win.SpeechRecognition || Win.webkitSpeechRecognition;

    try {
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = getLanguageCode(language);
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setStatus('listening');
        // Set maximum duration safety timer
        timeoutRef.current = window.setTimeout(() => {
          stop();
        }, maxDurationMs);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            currentFinal += res[0].transcript;
          } else {
            currentInterim += res[0].transcript;
          }
        }

        if (currentInterim) {
          setInterimTranscript(currentInterim);
        }

        if (currentFinal) {
          const cleanText = currentFinal.trim();
          setTranscript(cleanText);
          setInterimTranscript('');
          setStatus('ready');
          if (onResult) {
            onResult(cleanText);
          }
        }
      };

      recognition.onerror = (event: any) => {
        const err = event.error;
        if (err === 'no-speech') {
          setError({ type: 'no_speech' });
        } else if (err === 'not-allowed' || err === 'service-not-allowed') {
          setError({ type: 'permission_denied' });
        } else if (err === 'network') {
          setError({ type: 'network' });
        } else if (err === 'aborted') {
          return;
        } else {
          setError({ type: 'generic', message: err });
        }
        setStatus('error');
      };

      recognition.onend = () => {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        // If we ended while listening and got no transcript or error
        setStatus((prev) => (prev === 'listening' ? 'idle' : prev));
      };

      recognition.start();
    } catch (e: any) {
      setError({ type: 'generic', message: e?.message });
      setStatus('error');
    }
  }, [isSupported, language, getLanguageCode, maxDurationMs, onResult, stop, cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isSupported,
    status,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    cancel,
    reset: () => {
      cancel();
      setError(null);
      setTranscript('');
    },
  };
}
