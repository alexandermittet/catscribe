'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { da } from '../i18n/da';
import { en } from '../i18n/en';

type Language = 'da' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = { da, en };

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('da'); // Default to Danish

  useEffect(() => {
    // Load saved language preference from localStorage (client-side only)
    const savedLanguage = localStorage.getItem('language_preference') as Language;
    if (savedLanguage && (savedLanguage === 'da' || savedLanguage === 'en')) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language_preference', lang);
    }
    
    // Update HTML lang attribute
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  };

  // Translation function with nested key support
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
