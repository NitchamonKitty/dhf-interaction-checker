import i18n from '../lib/i18n';
export function tBi(key, fallbackTh = '', fallbackEn = '') {
  const bilingual = localStorage.getItem('bilingualMode') === 'on';
  const th = i18n.getResource('th', 'translation', key) ?? fallbackTh ?? key;
  const en = i18n.getResource('en', 'translation', key) ?? fallbackEn ?? key;
  if (bilingual) {
    if (th && en && th.toLowerCase() !== en.toLowerCase()) return `${th} (${en})`;
    return th || en || key;
  }
  return i18n.language === 'th' ? (th || en || key) : (en || th || key);
}
