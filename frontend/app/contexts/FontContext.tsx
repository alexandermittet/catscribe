'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type FontPreference = 'default' | 'barbie';

interface FontContextType {
  font: FontPreference;
  setFont: (font: FontPreference) => void;
  toggleFont: () => void;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

export function FontProvider({ children }: { children: ReactNode }) {
  const [font, setFontState] = useState<FontPreference>('default');

  const applyFont = (fontPreference: FontPreference) => {
    if (typeof document !== 'undefined') {
      const body = document.body;
      if (fontPreference === 'barbie') {
        body.style.fontFamily = 'barbie, sans-serif';
      } else {
        body.style.fontFamily = '';
      }
    }
  };

  useEffect(() => {
    // Load saved font preference from localStorage (client-side only)
    const savedFont = localStorage.getItem('font_preference') as FontPreference;
    if (savedFont && (savedFont === 'default' || savedFont === 'barbie')) {
      setFontState(savedFont);
    }
  }, []);

  useEffect(() => {
    // Apply font whenever font state changes
    applyFont(font);
  }, [font]);

  const setFont = (fontPreference: FontPreference) => {
    setFontState(fontPreference);
    if (typeof window !== 'undefined') {
      localStorage.setItem('font_preference', fontPreference);
    }
    applyFont(fontPreference);
  };

  const toggleFont = () => {
    const newFont = font === 'default' ? 'barbie' : 'default';
    setFont(newFont);
  };

  return (
    <FontContext.Provider value={{ font, setFont, toggleFont }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFont() {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error('useFont must be used within a FontProvider');
  }
  return context;
}
