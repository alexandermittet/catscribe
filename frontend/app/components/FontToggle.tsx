'use client';

import { useFont } from '../contexts/FontContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function FontToggle() {
  const { font, toggleFont } = useFont();
  const { t } = useLanguage();

  return (
    <button
      onClick={toggleFont}
      className="fixed top-4 left-4 z-50 px-4 py-2 rounded-lg font-semibold transition-all hover:scale-105 shadow-lg"
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
      aria-label={t('fontToggle.toggle')}
      title={font === 'barbie' ? t('fontToggle.disable') : t('fontToggle.enable')}
    >
      {font === 'barbie' ? '✨' : '🎀'} {t('fontToggle.label')}
    </button>
  );
}
