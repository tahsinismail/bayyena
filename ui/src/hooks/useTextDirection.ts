"use client";

import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Hook to get text direction properties for consistent text rendering
 * Keeps layout consistent while applying appropriate text direction
 */
export function useTextDirection() {
  const { language } = useLanguage();
  
  return {
    // Apply to text containers to follow natural text direction
    textProps: {
      lang: language,
      className: language === 'ar' ? 'arabic-text' : 'english-text'
    },
    
    // Apply to mixed content that should auto-detect direction
    mixedTextProps: {
      className: 'text-content'
    },
    
    // Force LTR for technical content regardless of language
    ltrProps: {
      className: 'ltr-content'
    },
    
    // Current language info
    isArabic: language === 'ar',
    isEnglish: language === 'en',
    language
  };
}
