"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

// Import locale files
import enTranslations from '@/locales/en.json';
import arTranslations from '@/locales/ar.json';

export type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  dir: 'ltr' | 'rtl';
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation storage from imported JSON files
const translations: Record<Language, Record<string, any>> = {
  en: enTranslations,
  ar: arTranslations
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Check localStorage first, then browser language, then default to English
    const storedLanguage = localStorage.getItem('language') as Language | null;
    if (storedLanguage && (storedLanguage === 'en' || storedLanguage === 'ar')) {
      setLanguageState(storedLanguage);
    } else {
      // Check browser language
      const browserLanguage = navigator.language.toLowerCase();
      if (browserLanguage.startsWith('ar')) {
        setLanguageState('ar');
      } else {
        setLanguageState('en');
      }
    }
  }, []);

  useEffect(() => {
    // Apply language and direction to document element
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('language', language);
  }, [language]);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
  };

  const toggleLanguage = () => {
    setLanguageState(prev => prev === 'en' ? 'ar' : 'en');
  };

  const t = (key: string, fallback?: string) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return fallback || key;
      }
    }
    
    return typeof value === 'string' ? value : fallback || key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      toggleLanguage, 
      dir, 
      t 
    }}>
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
