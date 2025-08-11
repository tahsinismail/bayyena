import { useTranslation } from 'react-i18next';
import { Button, Flex } from '@radix-ui/themes';
import { useEffect, useState } from 'react';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    // Initialize with stored language or default to English
    const stored = localStorage.getItem('i18nextLng');
    return stored && ['en', 'ar'].includes(stored) ? stored : 'en';
  });

  // Update local state when i18n language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLanguage(i18n.language);
    };

    // Set initial language - ensure it's always a valid language
    const initialLang = i18n.language && ['en', 'ar'].includes(i18n.language) 
      ? i18n.language 
      : 'en';
    
    setCurrentLanguage(initialLang);
    
    // If i18n doesn't have a valid language, set it
    if (!i18n.language || !['en', 'ar'].includes(i18n.language)) {
      i18n.changeLanguage('en');
    }

    // Listen for language changes
    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const changeLanguage = (lng: 'en' | 'ar') => {
    console.log(`[LanguageSwitcher] Changing language to: ${lng}`);
    i18n.changeLanguage(lng);
    setCurrentLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  return (
    <Flex gap="3">
      <Button
        color='gold'
        variant={currentLanguage === 'en' ? 'solid' : 'soft'}
        onClick={() => changeLanguage('en')}
      >
        {t('english')}
      </Button>
      <Button
        color='gold'
        variant={currentLanguage === 'ar' ? 'solid' : 'soft'}
        onClick={() => changeLanguage('ar')}
      >
        {t('arabic')}
      </Button>
    </Flex>
  );
}
