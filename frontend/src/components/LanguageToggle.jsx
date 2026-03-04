// frontend/src/components/LanguageToggle.jsx
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n, t } = useTranslation();

  const initialLang =
    (i18n?.language && i18n.language.toLowerCase()) ||
    (localStorage.getItem('i18nLang') || localStorage.getItem('lang')) ||
    'th';

  const [lang, setLang] = useState(initialLang);

  useEffect(() => {
    try {
      if (i18n?.changeLanguage && i18n.language !== lang) {
        i18n.changeLanguage(lang);
      }

      localStorage.setItem('lang', lang);
      localStorage.setItem('i18nLang', lang);

      localStorage.setItem('bilingualMode', 'off');

      window.dispatchEvent(new Event('langchange'));
      window.dispatchEvent(new Event('bilingualModeChange'));
    } catch {

    }
  }, [lang, i18n]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="opacity-70">{t('ui.language', 'ภาษา')}:</span>

      <button
        onClick={() => setLang('th')}
        className={`px-2 py-1 rounded ${lang === 'th' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
        aria-pressed={lang === 'th'}
      >
        {t('ui.thai', 'ไทย')}
      </button>

      <button
        onClick={() => setLang('en')}
        className={`px-2 py-1 rounded ${lang === 'en' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
        aria-pressed={lang === 'en'}
      >
        {t('ui.english', 'อังกฤษ')}
      </button>
    </div>
  );
}
