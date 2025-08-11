import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const useLanguageInit = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Ensure default language is set on first load
    const currentLang = i18n.language;
    const storedLang = localStorage.getItem('i18nextLng');
    
    console.log('[useLanguageInit] Current language:', currentLang);
    console.log('[useLanguageInit] Stored language:', storedLang);
    
    // If no language is set or stored, default to English
    if (!currentLang || (!storedLang && currentLang !== 'en')) {
      console.log('[useLanguageInit] Setting default language to English');
      i18n.changeLanguage('en');
      localStorage.setItem('i18nextLng', 'en');
    }
    
    // If there's a stored language preference, use it
    if (storedLang && storedLang !== currentLang) {
      console.log('[useLanguageInit] Using stored language preference:', storedLang);
      i18n.changeLanguage(storedLang);
    }
  }, [i18n]);

  return { currentLanguage: i18n.language };
};
