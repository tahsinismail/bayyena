import { type ReactNode, useEffect } from 'react';
import { Box, Button, Flex, Text } from '@radix-ui/themes';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguageInit } from '../hooks/useLanguageInit';

import logo from '../assets/logo.png';
import { Link } from 'wouter';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const { t, i18n } = useTranslation();
  useLanguageInit();

  // This effect handles the Left-to-Right / Right-to-Left layout direction
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.dir(i18n.language);
  }, [i18n, i18n.language]);

  const handleLogout = async () => {
    // We don't have a dedicated auth API file, so we call directly
    await apiClient.post('/auth/logout');
    setUser(null);
  };

  return (
    <Flex direction="column" className="min-h-screen">
      <Box p="4" className="border-b border-[#856A00]">
        <Flex justify="between" align="center">
          <Link href="/">
            <Flex direction="row" align="center" justify="center">
              <img src={logo} alt="Logo" width={50} height={50}/>
              <Text weight="bold" size="7" color='gold'>{t('BAYYENA')}</Text>
            </Flex>
          </Link>
          <Flex gap="6" align="center">
            <LanguageSwitcher />
            <Text>{t('welcome', { name: user?.fullName })}</Text>
            <Button onClick={handleLogout} variant="soft" color="red">
              {t('logout')}
            </Button>
          </Flex>
        </Flex>
      </Box>
      <main className="flex-grow bg-gray-50">{children}</main>
    </Flex>
  );
}
