"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  MdLanguage,
  MdDarkMode,
  MdLightMode,
  MdSettingsSystemDaydream,
  MdMenu
} from "react-icons/md";

interface FloatingControlsProps {
  onMenuClick: () => void;
}

export function FloatingControls({ onMenuClick }: FloatingControlsProps) {
  const { theme, setTheme, actualTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  const handleThemeClick = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getThemeIcon = () => {
    if (theme === 'system') {
      return <MdSettingsSystemDaydream className="h-4 w-4" />;
    }
    return actualTheme === 'light' ? (
      <MdDarkMode className="h-4 w-4" />
    ) : (
      <MdLightMode className="h-4 w-4" />
    );
  };

  const getThemeTitle = () => {
    if (theme === 'system') {
      return t('topbar.switchToLight');
    }
    return t(actualTheme === 'light' ? 'topbar.switchToDark' : 'topbar.switchToLight');
  };

  return (
    <div className="hidden xl:flex fixed top-4 right-4 z-50 items-center gap-2">
      {/* Menu button - now only for xl screens (since sidebar is always available on smaller screens) */}
      {/* No need for menu button here since topbar handles it up to 1024px */}
      
      {/* Language toggle - COMMENTED OUT */}
      {/* <Button
        variant="ghost"
        size="sm"
        className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-sm"
        onClick={toggleLanguage}
        title={t(language === 'en' ? 'topbar.switchToArabic' : 'topbar.switchToEnglish')}
      >
        <MdLanguage className="h-4 w-4" />
      </Button> */}
      
      {/* Theme toggle - COMMENTED OUT */}
      {/* <Button
        variant="ghost"
        size="sm"
        className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-sm"
        onClick={handleThemeClick}
        title={getThemeTitle()}
      >
        {getThemeIcon()}
      </Button> */}
    </div>
  );
}
