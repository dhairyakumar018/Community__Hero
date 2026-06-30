import { useState, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../messages/translations';

export function useTranslations() {
  const [locale, setLocaleState] = useState<Language>(() => {
    const saved = localStorage.getItem('community_hero_lang');
    return (saved as Language) || 'en';
  });

  const setLocale = (lang: Language) => {
    localStorage.setItem('community_hero_lang', lang);
    setLocaleState(lang);
    // Dispatch custom event to sync across components
    window.dispatchEvent(new Event('community_hero_lang_changed'));
  };

  useEffect(() => {
    const handleLangChange = () => {
      const saved = localStorage.getItem('community_hero_lang');
      if (saved && saved !== locale) {
        setLocaleState(saved as Language);
      }
    };
    window.addEventListener('community_hero_lang_changed', handleLangChange);
    return () => {
      window.removeEventListener('community_hero_lang_changed', handleLangChange);
    };
  }, [locale]);

  const t = (key: string): string => {
    const dict = translations[locale] || translations.en;
    return dict[key] || translations.en[key] || key;
  };

  return { t, locale, setLocale };
}
export default useTranslations;
