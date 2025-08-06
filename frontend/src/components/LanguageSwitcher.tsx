import { useTranslation } from 'react-i18next';
import { Button, Flex } from '@radix-ui/themes';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: 'en' | 'ar') => {
    i18n.changeLanguage(lng);
  };

  return (
    <Flex gap="3">
      <Button
        variant={i18n.language === 'en' ? 'solid' : 'soft'}
        onClick={() => changeLanguage('en')}
      >
        {t('english')}
      </Button>
      <Button
        variant={i18n.language === 'ar' ? 'solid' : 'soft'}
        onClick={() => changeLanguage('ar')}
      >
        {t('arabic')}
      </Button>
    </Flex>
  );
}
