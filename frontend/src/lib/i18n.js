import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import th from './th.json';

function getInitialLang() {
  const qs = new URLSearchParams(window.location.search);
  const urlLang = qs.get('lang');
  const saved = localStorage.getItem('lang');
  if (urlLang) { localStorage.setItem('lang', urlLang); return urlLang; }
  if (saved) return saved;
  return navigator.language?.toLowerCase().startsWith('th') ? 'th' : 'en';
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, th: { translation: th } },
  lng: getInitialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
