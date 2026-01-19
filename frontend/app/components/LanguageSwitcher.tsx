'use client';

import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    const newLanguage = language === 'da' ? 'en' : 'da';
    setLanguage(newLanguage);
    
    // Mark that the language switcher has been interacted with
    const fingerprint = localStorage.getItem('fingerprint');
    if (fingerprint) {
      localStorage.setItem(`language_switcher_seen_${fingerprint}`, 'true');
    }
  };

  return (
    <button
      onClick={toggleLanguage}
      className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg font-semibold transition-all hover:scale-105 shadow-lg"
      style={{
        backgroundColor: '#F285CC',
        color: '#591E45',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#F277C7';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#F285CC';
      }}
      aria-label="Switch language"
    >
      {t(`languageSwitcher.${language === 'da' ? 'en' : 'da'}`)}
    </button>
  );
}
