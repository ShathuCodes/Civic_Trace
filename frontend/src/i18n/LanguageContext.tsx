import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { Language, TranslationDictionary, SUPPORTED_LANGUAGES, LanguageOption } from './types';
import { en } from './translations/en';
import { si } from './translations/si';
import { ta } from './translations/ta';

const DICTIONARIES: Record<Language, TranslationDictionary> = { en, si, ta };

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationDictionary;
  languages: LanguageOption[];
  currentLang: LanguageOption;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem('ct-lang') as Language;
      if (stored && ['en', 'si', 'ta'].includes(stored)) return stored;
    } catch {
      // ignore
    }
    return 'en';
  });

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    try {
      localStorage.setItem('ct-lang', lang);
    } catch {
      // ignore
    }
  }

  // Update <html lang="..."> attribute for accessibility
  useEffect(() => {
    const langMap: Record<Language, string> = { en: 'en', si: 'si', ta: 'ta' };
    document.documentElement.lang = langMap[language];
  }, [language]);

  const t = DICTIONARIES[language];
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language)!;

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, languages: SUPPORTED_LANGUAGES, currentLang }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
