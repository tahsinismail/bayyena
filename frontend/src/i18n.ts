import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationAR from './locales/ar/translation.json';

const resources = {
  en: {
    translation: translationEN,
  },
  ar: {
    translation: translationAR,
  },
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n down to react-i18next
  .init({
    resources,
    lng: 'en', // Set explicit default language
    fallbackLng: 'en', // Use English if detected language is not available
    debug: import.meta.env.DEV, // Enable debug in development
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    detection: {
      order: ['localStorage', 'navigator'], // Check localStorage first, then the browser
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng', // Custom key for localStorage
    },
  });

// Ensure default language is set after initialization
i18n.on('initialized', () => {
  console.log('[i18n] i18n initialized with language:', i18n.language);
  
  if (!i18n.language || !['en', 'ar'].includes(i18n.language)) {
    console.log('[i18n] Setting default language to English');
    i18n.changeLanguage('en');
    localStorage.setItem('i18nextLng', 'en');
  }
  
  console.log('[i18n] Final language after initialization:', i18n.language);
});

export default i18n;
